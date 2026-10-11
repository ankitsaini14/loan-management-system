import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { config } from "./config.js";
import { HttpError } from "./errors.js";
import { asyncHandler } from "./middleware/async.js";
import { requireAuth } from "./middleware/auth.js";
import { User } from "./models/User.js";
import { authRouter } from "./routes/auth.js";
import { borrowerRouter } from "./routes/borrower.js";
import { staffRouter } from "./routes/staff.js";

export const app = express();
const uploadsDir = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const allowed = new Set([
        ...config.clientOrigins,
        "http://localhost:4511",
        "http://127.0.0.1:4511",
      ]);
      if (allowed.has(origin) || /^https:\/\/[\w.-]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, data: { service: "lms-api" } });
});

app.use("/api/auth", authRouter);
app.use("/api/borrower", borrowerRouter);
app.use("/api", staffRouter);

app.get(
  "/api/files/:filename",
  requireAuth,
  asyncHandler(async (req, res) => {
    const filename = req.params.filename;
    if (!/^[a-zA-Z0-9-]+\.(pdf|jpe?g|png)$/.test(filename)) {
      throw new HttpError(400, "Invalid file");
    }
    const owner = await User.findOne({ "salarySlip.filename": filename });
    if (!owner?.salarySlip?.filename) throw new HttpError(404, "File not found");
    const isOwner = req.user?.role === "borrower" && req.user.id === String(owner._id);
    const isStaff = req.user?.role !== "borrower";
    if (!isOwner && !isStaff) throw new HttpError(403, "You cannot view this file");
    const filePath = path.join(uploadsDir, owner.salarySlip.filename);
    if (!fs.existsSync(filePath)) throw new HttpError(404, "File not found");
    res.type(owner.salarySlip.mimeType || "application/octet-stream");
    res.sendFile(filePath);
  }),
);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({ ok: false, message: error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ ok: false, message: error.message, reasons: error.reasons });
    return;
  }
  if (typeof error === "object" && error && "code" in error && error.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ ok: false, message: "Salary slip must be 5 MB or smaller" });
    return;
  }
  console.error(error);
  res.status(500).json({ ok: false, message: "Something went wrong" });
});
