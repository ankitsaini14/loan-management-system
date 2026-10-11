import bcrypt from "bcryptjs";
import { pathToFileURL } from "node:url";
import { User, type Role } from "./models/User.js";

export const DEMO_ACCOUNTS: { role: Role; name: string; email: string; password: string }[] = [
  { role: "admin", name: "Admin User", email: "admin@lms.dev", password: "Admin@123" },
  { role: "sales", name: "Sales Executive", email: "sales@lms.dev", password: "Sales@123" },
  { role: "sanction", name: "Sanction Executive", email: "sanction@lms.dev", password: "Sanction@123" },
  { role: "disbursement", name: "Disbursement Executive", email: "disbursement@lms.dev", password: "Disburse@123" },
  { role: "collection", name: "Collection Executive", email: "collection@lms.dev", password: "Collect@123" },
  { role: "borrower", name: "Asha Verma", email: "borrower@lms.dev", password: "Borrower@123" },
];

export async function seedIfEmpty() {
  const count = await User.countDocuments();
  if (count > 0) return;
  await User.insertMany(
    await Promise.all(
      DEMO_ACCOUNTS.map(async (account) => ({
        name: account.name,
        email: account.email,
        role: account.role,
        passwordHash: await bcrypt.hash(account.password, 10),
      })),
    ),
  );
  console.log("Seeded one login for each role");
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const { connectDb, disconnectDb } = await import("./db.js");
  await connectDb();
  await seedIfEmpty();
  await disconnectDb();
}
