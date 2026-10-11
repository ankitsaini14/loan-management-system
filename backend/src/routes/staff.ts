import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { round2 } from "../domain/money.js";
import { HttpError } from "../errors.js";
import { asyncHandler } from "../middleware/async.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { Loan } from "../models/Loan.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";

function idOrThrow(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value[0] : value;
  if (!id || !mongoose.isValidObjectId(id)) throw new HttpError(400, "Invalid loan id");
  return id;
}

async function loansWithBorrower(status: string | string[]) {
  const loans = await Loan.find({ status: Array.isArray(status) ? { $in: status } : status })
    .sort({ updatedAt: -1 })
    .populate("borrower", "name email personal salarySlip");
  const ids = loans.map((loan) => loan._id);
  const payments = await Payment.find({ loan: { $in: ids } });
  return loans.map((loan) => {
    const borrower = loan.borrower as unknown as {
      _id: mongoose.Types.ObjectId;
      name: string;
      email: string;
      personal?: {
        fullName?: string;
        pan?: string;
        dob?: Date;
        monthlySalary?: number;
        employmentMode?: string;
      };
      salarySlip?: { originalName?: string; filename?: string };
    };
    const paid = round2(
      payments.filter((payment) => String(payment.loan) === String(loan._id)).reduce((sum, payment) => sum + payment.amount, 0),
    );
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
      borrower: borrower
        ? {
            id: String(borrower._id),
            name: borrower.name,
            email: borrower.email,
            fullName: borrower.personal?.fullName ?? borrower.name,
            pan: borrower.personal?.pan ?? null,
            dob: borrower.personal?.dob ? borrower.personal.dob.toISOString().slice(0, 10) : null,
            monthlySalary: borrower.personal?.monthlySalary ?? null,
            employmentMode: borrower.personal?.employmentMode ?? null,
            salarySlip: borrower.salarySlip?.filename
              ? { filename: borrower.salarySlip.filename, originalName: borrower.salarySlip.originalName }
              : null,
          }
        : null,
    };
  });
}

export const staffRouter = Router();
staffRouter.use(requireAuth);

staffRouter.get(
  "/sales/leads",
  requireStaff("sales"),
  asyncHandler(async (_req, res) => {
    const borrowers = await User.find({ role: "borrower" }).sort({ createdAt: -1 });
    const loans = await Loan.find({ borrower: { $in: borrowers.map((user) => user._id) } }).select("borrower");
    const applied = new Set(loans.map((loan) => String(loan.borrower)));
    const leads = borrowers
      .filter((user) => !applied.has(String(user._id)))
      .map((user) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        profileComplete: Boolean(user.personal?.fullName),
        brePassed: user.bre?.checkedAt ? Boolean(user.bre.passed) : null,
        breReasons: user.bre?.reasons ?? [],
      }));
    res.json({ ok: true, data: leads });
  }),
);

staffRouter.get(
  "/sanction/loans",
  requireStaff("sanction"),
  asyncHandler(async (_req, res) => {
    res.json({ ok: true, data: await loansWithBorrower("applied") });
  }),
);

staffRouter.post(
  "/sanction/loans/:id/decision",
  requireStaff("sanction"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        decision: z.enum(["approve", "reject"]),
        reason: z.string().trim().optional(),
      })
      .parse(req.body);
    if (body.decision === "reject" && (!body.reason || body.reason.length < 3)) {
      throw new HttpError(400, "A rejection reason is required");
    }
    const loan = await Loan.findById(idOrThrow(req.params.id));
    if (!loan || loan.status !== "applied") throw new HttpError(404, "No applied loan found");
    if (body.decision === "approve") {
      loan.status = "sanctioned";
      loan.sanctionedAt = new Date();
      loan.sanctionedBy = new mongoose.Types.ObjectId(req.user!.id);
      loan.rejectionReason = undefined;
    } else {
      loan.status = "rejected";
      loan.rejectionReason = body.reason;
    }
    await loan.save();
    res.json({ ok: true, data: (await loansWithBorrower(loan.status)).find((item) => item.id === String(loan._id)) });
  }),
);

staffRouter.get(
  "/disbursement/loans",
  requireStaff("disbursement"),
  asyncHandler(async (_req, res) => {
    res.json({ ok: true, data: await loansWithBorrower("sanctioned") });
  }),
);

staffRouter.post(
  "/disbursement/loans/:id/disburse",
  requireStaff("disbursement"),
  asyncHandler(async (req, res) => {
    const loan = await Loan.findById(idOrThrow(req.params.id));
    if (!loan || loan.status !== "sanctioned") throw new HttpError(404, "No sanctioned loan found");
    loan.status = "disbursed";
    loan.disbursedAt = new Date();
    loan.disbursedBy = new mongoose.Types.ObjectId(req.user!.id);
    await loan.save();
    res.json({ ok: true, data: { id: String(loan._id), status: loan.status } });
  }),
);

staffRouter.get(
  "/collection/loans",
  requireStaff("collection"),
  asyncHandler(async (_req, res) => {
    const rows = await loansWithBorrower(["disbursed", "closed"]);
    const ids = rows.map((row) => row.id);
    const payments = await Payment.find({ loan: { $in: ids } }).sort({ paidOn: 1 });
    const data = rows.map((row) => ({
      ...row,
      payments: payments
        .filter((payment) => String(payment.loan) === row.id)
        .map((payment) => ({
          id: String(payment._id),
          utr: payment.utr,
          amount: payment.amount,
          paidOn: payment.paidOn.toISOString().slice(0, 10),
        })),
    }));
    res.json({ ok: true, data });
  }),
);

staffRouter.post(
  "/collection/loans/:id/payments",
  requireStaff("collection"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        utr: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6,30}$/, "UTR must be 6–30 letters or numbers"),
        amount: z.coerce.number().positive("Amount must be greater than 0"),
        paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid payment date"),
      })
      .parse(req.body);
    const loan = await Loan.findById(idOrThrow(req.params.id));
    if (!loan || loan.status !== "disbursed") throw new HttpError(404, "No active disbursed loan found");
    const existing = await Payment.find({ loan: loan._id });
    const paid = round2(existing.reduce((sum, payment) => sum + payment.amount, 0));
    const outstanding = round2(loan.totalRepayment - paid);
    const amount = round2(body.amount);
    if (amount - outstanding > 0.001) {
      throw new HttpError(400, `Amount cannot exceed the outstanding balance of ₹${outstanding.toFixed(2)}`);
    }
    try {
      await Payment.create({
        loan: loan._id,
        utr: body.utr,
        amount,
        paidOn: new Date(`${body.paidOn}T00:00:00.000Z`),
        recordedBy: req.user!.id,
      });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === 11000) {
        throw new HttpError(409, "This UTR number has already been used");
      }
      throw error;
    }
    const nextPaid = round2(paid + amount);
    if (loan.totalRepayment - nextPaid <= 0.009) {
      loan.status = "closed";
      loan.closedAt = new Date();
      await loan.save();
    }
    res.status(201).json({ ok: true, data: { status: loan.status, paid: nextPaid, outstanding: round2(Math.max(0, loan.totalRepayment - nextPaid)) } });
  }),
);
