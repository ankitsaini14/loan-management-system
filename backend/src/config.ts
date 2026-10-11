import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 5050),
  mongoUri: process.env.MONGODB_URI?.trim() || "",
  jwtSecret: process.env.JWT_SECRET?.trim() || "dev-only-change-me",
  clientOrigins: (process.env.CLIENT_ORIGIN?.trim() || "http://localhost:4511")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  annualRate: 12,
  minSalary: 25_000,
  minAge: 23,
  maxAge: 50,
  minAmount: 50_000,
  maxAmount: 500_000,
  minTenure: 30,
  maxTenure: 365,
  maxUploadBytes: 5 * 1024 * 1024,
};
