import path from "node:path";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../config.js";
import { runBre, parseDob, type EmploymentMode } from "../domain/bre.js";
import { quoteLoan, round2 } from "../domain/money.js";
import { HttpError } from "../errors.js";
import { asyncHandler } from "../middleware/async.js";
import { requireAuth, requireBorrower } from "../middleware/auth.js";
import { Loan } from "../models/Loan.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";

const uploadsDir = path.resolve(process.cwd(), "uploads");

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.mimetype)) {
      cb(new HttpError(400, "Salary slip must be a PDF, JPG, or PNG"));
      return;
    }
    cb(null, true);
  },
});

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the full name"),
  pan: z.string().trim().transform((value) => value.toUpperCase()),
  dob: z.string().trim(),
  monthlySalary: z.coerce.number().positive("Enter a monthly salary"),
  employmentMode: z.enum(["salaried", "self_employed", "unemployed"]),
});

const applySchema = z.object({
  amount: z.coerce.number().int(),
  tenureDays: z.coerce.number().int(),
});

async function currentBorrower(id: string) {
  const user = await User.findById(id);
  if (!user) throw new HttpError(401, "Account not found");
  return user;
}

export function presentPersonal(user: {
  personal?: {
    fullName?: string | null;
    pan?: string | null;
    dob?: Date | null;
    monthlySalary?: number | null;
    employmentMode?: string | null;
  } | null;
}) {
  if (!user.personal?.fullName || !user.personal.dob) return null;
  return {
    fullName: user.personal.fullName,
    pan: user.personal.pan,
    dob: user.personal.dob.toISOString().slice(0, 10),
    monthlySalary: user.personal.monthlySalary,
    employmentMode: user.personal.employmentMode,
  };
}

export async function presentLoan(loanId: unknown) {
  const loan = await Loan.findById(loanId);
  if (!loan) return null;
  const payments = await Payment.find({ loan: loan._id }).sort({ paidOn: 1 });
  const paid = round2(payments.reduce((sum, payment) => sum + payment.amount, 0));
  return {
    id: String(loan._id),
    amount: loan.amount,
    tenureDays: loan.tenureDays,
    annualRate: loan.annualRate,
    simpleInterest: loan.simpleInterest,
    totalRepayment: loan.totalRepayment,
    status: loan.status,
    rejectionReason: loan.rejectionReason ?? null,
    createdAt: loan.createdAt,
    sanctionedAt: loan.sanctionedAt ?? null,
    disbursedAt: loan.disbursedAt ?? null,
    closedAt: loan.closedAt ?? null,
    paid,
    outstanding: round2(Math.max(0, loan.totalRepayment - paid)),
    payments: payments.map((payment) => ({
      id: String(payment._id),
      utr: payment.utr,
      amount: payment.amount,
      paidOn: payment.paidOn.toISOString().slice(0, 10),
    })),
  };
}

export const borrowerRouter = Router();
borrowerRouter.use(requireAuth, requireBorrower);

borrowerRouter.get(
  "/state",
  asyncHandler(async (req, res) => {
    const user = await currentBorrower(req.user!.id);
    const active = await Loan.findOne({
      borrower: user._id,
      status: { $in: ["applied", "sanctioned", "disbursed"] },
    }).sort({ createdAt: -1 });
    const loan = active ?? (await Loan.findOne({ borrower: user._id }).sort({ createdAt: -1 }));
    res.json({
      ok: true,
      data: {
        personal: presentPersonal(user),
        bre: user.bre?.checkedAt
          ? { passed: Boolean(user.bre.passed), reasons: user.bre.reasons ?? [], age: user.bre.age ?? null }
          : null,
        salarySlip: user.salarySlip?.filename
          ? {
              originalName: user.salarySlip.originalName,
              filename: user.salarySlip.filename,
              size: user.salarySlip.size,
            }
          : null,
        loan: loan ? await presentLoan(loan._id) : null,
      },
    });
  }),
);

borrowerRouter.post(
  "/profile",
  asyncHandler(async (req, res) => {
    const body = profileSchema.parse(req.body);
    const dob = parseDob(body.dob);
    if (!dob) throw new HttpError(400, "Enter a valid date of birth");
    const user = await currentBorrower(req.user!.id);
    const active = await Loan.exists({
      borrower: user._id,
      status: { $in: ["applied", "sanctioned", "disbursed"] },
    });
    if (active) throw new HttpError(409, "Personal details are locked while a loan is in progress");

    const bre = runBre({
      dob,
      monthlySalary: body.monthlySalary,
      pan: body.pan,
      employmentMode: body.employmentMode as EmploymentMode,
    });
    user.personal = {
      fullName: body.fullName,
      pan: body.pan,
      dob,
      monthlySalary: body.monthlySalary,
      employmentMode: body.employmentMode,
    };
    user.bre = { passed: bre.passed, reasons: bre.reasons, age: bre.age, checkedAt: new Date() };
    await user.save();

    if (!bre.passed) {
      throw new HttpError(422, "Application blocked by eligibility rules", bre.reasons);
    }
    res.json({ ok: true, data: { personal: presentPersonal(user), bre: { passed: true, reasons: [], age: bre.age } } });
  }),
);

borrowerRouter.post(
  "/salary-slip",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Choose a salary slip to upload");
    const user = await currentBorrower(req.user!.id);
    if (!user.bre?.passed) throw new HttpError(422, "Pass the eligibility check before uploading a salary slip");
    user.salarySlip = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };
    await user.save();
    res.json({
      ok: true,
      data: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
      },
    });
  }),
);

borrowerRouter.post(
  "/apply",
  asyncHandler(async (req, res) => {
    const body = applySchema.parse(req.body);
    if (body.amount < config.minAmount || body.amount > config.maxAmount) {
      throw new HttpError(400, "Loan amount must be between ₹50,000 and ₹5,00,000");
    }
    if (body.tenureDays < config.minTenure || body.tenureDays > config.maxTenure) {
      throw new HttpError(400, "Tenure must be between 30 and 365 days");
    }
    const user = await currentBorrower(req.user!.id);
    if (!user.bre?.passed) throw new HttpError(422, "Pass the eligibility check before applying");
    if (!user.salarySlip?.filename) throw new HttpError(422, "Upload a salary slip before applying");
    const active = await Loan.exists({
      borrower: user._id,
      status: { $in: ["applied", "sanctioned", "disbursed"] },
    });
    if (active) throw new HttpError(409, "You already have a loan in progress");

    const quote = quoteLoan(body.amount, body.tenureDays);
    const loan = await Loan.create({ borrower: user._id, ...quote, status: "applied" });
    res.status(201).json({ ok: true, data: await presentLoan(loan._id) });
  }),
);
