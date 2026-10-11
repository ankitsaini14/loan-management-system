import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const LOAN_STATUSES = ["applied", "sanctioned", "rejected", "disbursed", "closed"] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

const loanSchema = new Schema(
  {
    borrower: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    tenureDays: { type: Number, required: true },
    annualRate: { type: Number, required: true },
    simpleInterest: { type: Number, required: true },
    totalRepayment: { type: Number, required: true },
    status: { type: String, enum: LOAN_STATUSES, required: true, index: true },
    rejectionReason: String,
    sanctionedBy: { type: Schema.Types.ObjectId, ref: "User" },
    sanctionedAt: Date,
    disbursedBy: { type: Schema.Types.ObjectId, ref: "User" },
    disbursedAt: Date,
    closedAt: Date,
  },
  { timestamps: true },
);

export type LoanDocument = InferSchemaType<typeof loanSchema> & { _id: mongoose.Types.ObjectId };
export const Loan = mongoose.model("Loan", loanSchema);
