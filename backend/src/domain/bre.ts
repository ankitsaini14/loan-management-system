import { config } from "../config.js";

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export type EmploymentMode = "salaried" | "self_employed" | "unemployed";

export function ageInYears(dob: Date, today = new Date()) {
  const now = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export function parseDob(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

export function runBre(input: { dob: Date; monthlySalary: number; pan: string; employmentMode: EmploymentMode }) {
  const reasons: string[] = [];
  const age = ageInYears(input.dob);
  if (age < config.minAge || age > config.maxAge) {
    reasons.push(`Age must be between ${config.minAge} and ${config.maxAge}. Current age is ${age}.`);
  }
  if (input.monthlySalary < config.minSalary) {
    reasons.push("Monthly salary must be at least ₹25,000.");
  }
  if (!PAN_PATTERN.test(input.pan)) {
    reasons.push("PAN must look like ABCDE1234F.");
  }
  if (input.employmentMode === "unemployed") {
    reasons.push("Unemployed applicants are not eligible.");
  }
  return { passed: reasons.length === 0, reasons, age };
}
