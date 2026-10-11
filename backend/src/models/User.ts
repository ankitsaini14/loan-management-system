import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const ROLES = ["admin", "sales", "sanction", "disbursement", "collection", "borrower"] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    personal: {
      fullName: String,
      pan: String,
      dob: Date,
      monthlySalary: Number,
      employmentMode: { type: String, enum: ["salaried", "self_employed", "unemployed"] },
    },
    bre: {
      passed: Boolean,
      reasons: [String],
      age: Number,
      checkedAt: Date,
    },
    salarySlip: {
      originalName: String,
      filename: String,
      mimeType: String,
      size: Number,
    },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.model("User", userSchema);
