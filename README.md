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

---

## Live deployment (production)

### URLs

| What | URL |
|------|-----|
| **App (use this)** | https://loan-management-system.vercel.app |
| Short alias | https://lms-loan-desk.vercel.app |
| **Backend API (direct)** | https://lms-api-bz8e.onrender.com |
| API health | https://lms-api-bz8e.onrender.com/api/health |
| **Source code** | https://github.com/ankitsaini14/loan-management-system |

The browser should open the **Vercel** URL. Login and all data calls go to `/api/...` on the same host (see below).

### Where each part is hosted

| Layer | Host | Folder in repo | Role |
|-------|------|----------------|------|
| Frontend | [Vercel](https://vercel.com) | `frontend/` | UI, Next.js pages |
| Backend | [Render](https://render.com) (free) | `backend/` | REST API, JWT, file uploads |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) | — | Users, loans, payments |

### How frontend and backend connect (production)

```text
User browser
    │
    ▼
https://loan-management-system.vercel.app   ← Vercel (Next.js)
    │
    │  fetch("/api/auth/login")  same origin — no CORS issues
    ▼
Vercel rewrite (next.config.ts)
    │
    ▼
https://lms-api-bz8e.onrender.com/api/...   ← Render (Express)
    │
    ▼
MongoDB Atlas (MONGODB_URI)
```

- **Local dev:** frontend `http://localhost:4511` calls `http://localhost:5050` (or proxied `/api` if configured).
- **Production:** Vercel env `BACKEND_URL` points to the Render service; the app uses relative `/api/*` paths.
- **Auth:** JWT stored in `localStorage`; sent as `Authorization: Bearer <token>` on each API request.
- **Logged-in users** are redirected away from `/login` and `/signup` (cannot stay on login via Back).

Render free tier may **sleep** after idle time; the first request after sleep can take 30–60 seconds.

### Demo accounts (working emails & passwords)

Use these on the live login page. Passwords are case-sensitive.

| Role | Email | Password | After login |
|------|-------|----------|-------------|
| Admin | admin@lms.dev | Admin@123 | Desk — all modules |
| Sales | sales@lms.dev | Sales@123 | Desk — Leads |
| Sanction | sanction@lms.dev | Sanction@123 | Desk — Applied loans |
| Disbursement | disbursement@lms.dev | Disburse@123 | Desk — Sanctioned loans |
| Collection | collection@lms.dev | Collect@123 | Desk — Disbursed / closed |
| Borrower | borrower@lms.dev | Borrower@123 | Apply loan flow |

New users: **Sign up** only creates **borrower** accounts (any real-looking email you choose).

### End-to-end workflow (host + roles)

```text
BORROWER (Vercel /apply)
  Sign up or log in → profile + BRE checks → upload salary slip → submit loan → status: applied

SALES (Vercel /dashboard → Leads)
  See borrowers with no loan yet

SANCTION (/dashboard → Sanction)
  applied → Approve (sanctioned) or Reject (rejected)

DISBURSEMENT (/dashboard → Disbursement)
  sanctioned → Mark disbursed

COLLECTION (/dashboard → Collection)
  disbursed → Record payment (unique UTR) → closed when fully paid

ADMIN
  Same desk; can open every module
```

Loan status line: `applied` → `sanctioned` | `rejected` → `disbursed` → `closed`

### Environment variables (operators)

**Render (`backend`):**

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | Signs login tokens |
| `CLIENT_ORIGIN` | Allowed browser origin (Vercel app URL) |
| `PORT` | Set by Render automatically |

**Vercel (`frontend`):**

| Variable | Purpose |
|----------|---------|
| `BACKEND_URL` | Render API base, e.g. `https://lms-api-bz8e.onrender.com` |

Secrets are **not** in GitHub; only in Render/Vercel dashboards and local `backend/.env`.
