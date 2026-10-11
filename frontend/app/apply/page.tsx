"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequireRole } from "@/components/auth";
import { Banner, Field, PrimaryButton, StatusPill, TopBar, controlClass } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { employmentLabel, inr, quoteLoan } from "@/lib/format";

type LoanView = {
  id: string;
  amount: number;
  tenureDays: number;
  annualRate: number;
  simpleInterest: number;
  totalRepayment: number;
  status: string;
  rejectionReason: string | null;
  paid: number;
  outstanding: number;
  createdAt: string;
  sanctionedAt: string | null;
  disbursedAt: string | null;
  closedAt: string | null;
  payments: { id: string; utr: string; amount: number; paidOn: string }[];
};

type State = {
  personal: {
    fullName: string;
    pan: string;
    dob: string;
    monthlySalary: number;
    employmentMode: string;
  } | null;
  bre: { passed: boolean; reasons: string[]; age: number | null } | null;
  salarySlip: { originalName: string; filename: string; size: number } | null;
  loan: LoanView | null;
};

const STEPS = ["Details", "Salary slip", "Loan", "Status"];

export default function ApplyPage() {
  const { user, ready, logout } = useRequireRole("borrower");
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [again, setAgain] = useState(false);
  const [fullName, setFullName] = useState("");
  const [pan, setPan] = useState("");
  const [dob, setDob] = useState("");
  const [salary, setSalary] = useState("30000");
  const [employment, setEmployment] = useState("salaried");
  const [amount, setAmount] = useState(100000);
  const [tenure, setTenure] = useState(180);

  async function load() {
    const next = await api<State>("/api/borrower/state");
    setState(next);
    if (next.personal) {
      setFullName(next.personal.fullName);
      setPan(next.personal.pan);
      setDob(next.personal.dob);
      setSalary(String(next.personal.monthlySalary));
      setEmployment(next.personal.employmentMode);
    }
  }

  useEffect(() => {
    if (ready && user?.role === "borrower") {
      load().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load your application"));
    }
  }, [ready, user]);

  const step = useMemo(() => {
    if (!state?.bre?.passed) return 0;
    if (!state.salarySlip) return 1;
    const terminal = state.loan && (state.loan.status === "rejected" || state.loan.status === "closed");
    if (!state.loan || (terminal && again)) return 2;
    return 3;
  }, [state, again]);

  const quote = quoteLoan(amount, tenure);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setReasons([]);
    try {
      await api("/api/borrower/profile", {
        method: "POST",
        json: { fullName, pan, dob, monthlySalary: Number(salary), employmentMode: employment },
      });
      await load();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setReasons(caught.reasons);
        await load();
      } else setError("Could not save details");
    } finally {
      setPending(false);
    }
  }

  async function uploadSlip(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a PDF, JPG, or PNG up to 5 MB");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Salary slip must be 5 MB or smaller");
      return;
    }
    setPending(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      await api("/api/borrower/salary-slip", { method: "POST", body });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  async function apply(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await api("/api/borrower/apply", { method: "POST", json: { amount, tenureDays: tenure } });
      setAgain(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not apply");
    } finally {
      setPending(false);
    }
  }

  if (!ready || !user || user.role !== "borrower") return <main className="px-4 py-16 text-sm">Loading…</main>;

  return (
    <>
      <TopBar user={user} onLogout={logout} />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <ol className="space-y-2">
          {STEPS.map((label, index) => (
            <li key={label} className={`rounded-2xl px-4 py-3 text-sm ${index === step ? "bg-ink text-white" : "bg-[#fffdf8]"}`}>
              {index + 1}. {label}
            </li>
          ))}
        </ol>
        <section className="rounded-3xl bg-[#fffdf8] p-6 shadow-card">
          {error ? (
            <Banner tone="error">
              <p>{error}</p>
              {reasons.length > 0 ? (
                <ul className="mt-2 list-disc pl-5">
                  {reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
            </Banner>
          ) : null}

          {step === 0 ? (
            <form onSubmit={saveProfile} className="mt-4 space-y-4">
              <h1 className="font-display text-4xl">Personal details</h1>
              <p className="text-sm text-[#5e564e]">The server checks age, salary, PAN, and employment before you can continue.</p>
              <Field label="Full name">
                <input className={controlClass} value={fullName} onChange={(event) => setFullName(event.target.value)} required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="PAN">
                  <input className={controlClass} value={pan} onChange={(event) => setPan(event.target.value.toUpperCase())} placeholder="ABCDE1234F" required />
                </Field>
                <Field label="Date of birth">
                  <input className={controlClass} type="date" value={dob} onChange={(event) => setDob(event.target.value)} required />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Monthly salary (₹)">
                  <input className={controlClass} type="number" min="0" value={salary} onChange={(event) => setSalary(event.target.value)} required />
                </Field>
                <Field label="Employment">
                  <select className={controlClass} value={employment} onChange={(event) => setEmployment(event.target.value)}>
                    <option value="salaried">Salaried</option>
                    <option value="self_employed">Self-employed</option>
                    <option value="unemployed">Unemployed</option>
                  </select>
                </Field>
              </div>
              <PrimaryButton disabled={pending}>{pending ? "Checking…" : "Check eligibility"}</PrimaryButton>
            </form>
          ) : null}

          {step === 1 ? (
            <form onSubmit={uploadSlip} className="mt-4 space-y-4">
              <h1 className="font-display text-4xl">Salary slip</h1>
              <Banner tone="ok">Eligibility passed{state?.bre?.age ? ` at age ${state.bre.age}` : ""}.</Banner>
              <Field label="PDF, JPG, or PNG, up to 5 MB">
                <input className={controlClass} name="file" type="file" accept="application/pdf,image/jpeg,image/png" required />
              </Field>
              <PrimaryButton disabled={pending}>{pending ? "Uploading…" : "Upload slip"}</PrimaryButton>
            </form>
          ) : null}

          {step === 2 ? (
            <form onSubmit={apply} className="mt-4 space-y-5">
              <h1 className="font-display text-4xl">Choose the loan</h1>
              <p className="text-sm text-[#5e564e]">Slip on file: {state?.salarySlip?.originalName}. Interest is fixed at 12% per year.</p>
              <Field label={`Amount ${inr(amount)}`}>
                <input type="range" min={50000} max={500000} step={5000} value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="w-full" />
              </Field>
              <Field label={`Tenure ${tenure} days`}>
                <input type="range" min={30} max={365} step={1} value={tenure} onChange={(event) => setTenure(Number(event.target.value))} className="w-full" />
              </Field>
              <dl className="grid gap-3 rounded-2xl bg-[#f6f1e8] p-4 sm:grid-cols-3">
                <div><dt className="text-xs uppercase text-[#7a7168]">Simple interest</dt><dd className="text-lg">{inr(quote.simpleInterest)}</dd></div>
                <div><dt className="text-xs uppercase text-[#7a7168]">Rate</dt><dd className="text-lg">12% p.a.</dd></div>
                <div><dt className="text-xs uppercase text-[#7a7168]">Total repayment</dt><dd className="text-lg">{inr(quote.totalRepayment)}</dd></div>
              </dl>
              <PrimaryButton disabled={pending}>{pending ? "Submitting…" : "Apply"}</PrimaryButton>
            </form>
          ) : null}

          {step === 3 && state?.loan ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h1 className="font-display text-4xl">Your loan</h1>
                <StatusPill status={state.loan.status} />
              </div>
              <p className="text-sm text-[#5e564e]">
                {inr(state.loan.amount)} for {state.loan.tenureDays} days. Interest {inr(state.loan.simpleInterest)}. Total {inr(state.loan.totalRepayment)}.
              </p>
              {state.loan.status === "rejected" ? <Banner tone="error">Rejected: {state.loan.rejectionReason}</Banner> : null}
              {state.loan.status === "disbursed" || state.loan.status === "closed" ? (
                <p className="text-sm">Paid {inr(state.loan.paid)}. Outstanding {inr(state.loan.outstanding)}.</p>
              ) : null}
              <ol className="space-y-2 text-sm">
                <li>Applied</li>
                <li>{state.loan.sanctionedAt ? "Sanctioned" : state.loan.status === "rejected" ? "Not sanctioned" : "Waiting for sanction"}</li>
                <li>{state.loan.disbursedAt ? "Disbursed" : "Waiting for disbursement"}</li>
                <li>{state.loan.closedAt ? "Closed" : "Open"}</li>
              </ol>
              {state.loan.payments.length > 0 ? (
                <ul className="text-sm">
                  {state.loan.payments.map((payment) => (
                    <li key={payment.id}>{payment.paidOn}: {payment.utr} · {inr(payment.amount)}</li>
                  ))}
                </ul>
              ) : null}
              {state.loan.status === "rejected" || state.loan.status === "closed" ? (
                <PrimaryButton type="button" onClick={() => setAgain(true)}>Start another application</PrimaryButton>
              ) : null}
              <p className="text-xs text-[#7a7168]">Employment on file: {employmentLabel(state.personal?.employmentMode)}</p>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
