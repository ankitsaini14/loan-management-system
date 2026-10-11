# Loan Desk

A loan management system for the MERN assignment. Borrowers apply. Internal teams move each loan from applied to closed. Access is enforced in the browser and on the API.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Express, TypeScript
- MongoDB, Mongoose
- JWT and bcrypt

## Run

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
npm run dev
```

Open http://localhost:4511. The API is http://localhost:5050.

### MongoDB

Set `MONGODB_URI` in `backend/.env` (see `.env.example`). The project uses MongoDB Atlas (`mongodb+srv://...`).

Run `npm run dev` from the project root. The API logs `Connected to MongoDB` when the URI is valid.

If you **remove** `MONGODB_URI` from `backend/.env`, the API falls back to an embedded in-memory database (resets every time you stop the API).

Copy from `.env.example` if you need to recreate `backend/.env`. That file is gitignored.

## Logins

| Role | Email | Password |
|---|---|---|
| Admin | admin@lms.dev | Admin@123 |
| Sales | sales@lms.dev | Sales@123 |
| Sanction | sanction@lms.dev | Sanction@123 |
| Disbursement | disbursement@lms.dev | Disburse@123 |
| Collection | collection@lms.dev | Collect@123 |
| Borrower | borrower@lms.dev | Borrower@123 |

Signup creates borrower accounts only.

## Borrower flow

1. Sign up or log in. Passwords are hashed. Other pages require a token.
2. Personal details run the business rules on the server. The application stops when age is outside 23–50, salary is below ₹25,000, PAN is not `ABCDE1234F`, or employment is unemployed.
3. Upload a PDF, JPG, or PNG salary slip up to 5 MB.
4. Choose ₹50,000–₹5,00,000 and 30–365 days. Interest is 12% per year.

```text
SI = (P × R × T) / (365 × 100)
Total repayment = P + SI
```

Apply creates the loan with status `applied`.

## Desk flow

| Module | Sees | Action |
|---|---|---|
| Sales | Borrowers with no loan yet | Lead list |
| Sanction | Applied loans | Approve, or reject with a reason |
| Disbursement | Sanctioned loans | Mark disbursed |
| Collection | Disbursed and closed loans | Record UTR, amount, and date |

A payment UTR must be unique. The amount cannot exceed the outstanding balance. When the paid total reaches the repayment total, the loan status becomes `closed`.

Admin can open every module. Each other executive can open only their own. Borrowers cannot open the desk. The same rules are checked again on every API route.

## Statuses

`applied` → `sanctioned` or `rejected` → `disbursed` → `closed`
