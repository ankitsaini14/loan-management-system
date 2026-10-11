export function inr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function quoteLoan(principal: number, tenureDays: number, annualRate = 12) {
  const simpleInterest = Math.round(((principal * annualRate * tenureDays) / (365 * 100) + Number.EPSILON) * 100) / 100;
  return {
    simpleInterest,
    totalRepayment: Math.round((principal + simpleInterest + Number.EPSILON) * 100) / 100,
    annualRate,
  };
}

export function employmentLabel(value?: string | null) {
  if (value === "salaried") return "Salaried";
  if (value === "self_employed") return "Self-employed";
  if (value === "unemployed") return "Unemployed";
  return "Not provided";
}
