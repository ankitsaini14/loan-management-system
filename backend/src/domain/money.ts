import { config } from "../config.js";

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function quoteLoan(principal: number, tenureDays: number, annualRate = config.annualRate) {
  const simpleInterest = round2((principal * annualRate * tenureDays) / (365 * 100));
  return {
    amount: principal,
    tenureDays,
    annualRate,
    simpleInterest,
    totalRepayment: round2(principal + simpleInterest),
  };
}
