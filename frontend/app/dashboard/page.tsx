"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/components/auth";
import { Banner, Field, PrimaryButton, StatusPill, TopBar, controlClass } from "@/components/ui";
import { api, openProtectedFile, type Role } from "@/lib/api";
import { employmentLabel, inr } from "@/lib/format";

type ModuleKey = "sales" | "sanction" | "disbursement" | "collection";

type Lead = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  profileComplete: boolean;
  brePassed: boolean | null;
  breReasons: string[];
};

type Borrower = {
  name: string;
  email: string;
  fullName: string;
  pan: string | null;
  monthlySalary: number | null;
  employmentMode: string | null;
  salarySlip: { filename: string; originalName?: string } | null;
};

type LoanRow = {
  id: string;
  amount: number;
  tenureDays: number;
  simpleInterest: number;
  totalRepayment: number;
  status: string;
  outstanding: number;
  paid: number;
  borrower: Borrower | null;
  payments?: { id: string; utr: string; amount: number; paidOn: string }[];
};

const MODULES: { key: ModuleKey; label: string; roles: Role[] }[] = [
  { key: "sales", label: "Sales", roles: ["sales", "admin"] },
  { key: "sanction", label: "Sanction", roles: ["sanction", "admin"] },
  { key: "disbursement", label: "Disbursement", roles: ["disbursement", "admin"] },
  { key: "collection", label: "Collection", roles: ["collection", "admin"] },
];

export default function DashboardPage() {
  const { user, ready, logout } = useRequireRole("staff");
  const visible = MODULES.filter((module) => user && module.roles.includes(user.role));
  const [moduleKey, setModuleKey] = useState<ModuleKey>("sales");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [utr, setUtr] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [paying, setPaying] = useState<string | null>(null);

  const active = visible.find((module) => module.key === moduleKey) ?? visible[0];

  async function load(key = active?.key) {
    if (!key) return;
    setError("");
    if (key === "sales") setLeads(await api<Lead[]>("/api/sales/leads"));
    if (key === "sanction") setLoans(await api<LoanRow[]>("/api/sanction/loans"));
    if (key === "disbursement") setLoans(await api<LoanRow[]>("/api/disbursement/loans"));
    if (key === "collection") setLoans(await api<LoanRow[]>("/api/collection/loans"));
  }

  useEffect(() => {
    if (!ready || !user || user.role === "borrower") return;
    const first = MODULES.find((module) => module.roles.includes(user.role));
    if (first) setModuleKey(first.key);
  }, [ready, user]);

  useEffect(() => {
    if (!ready || !user || user.role === "borrower" || !active) return;
    load(active.key).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load this module"));
  }, [ready, user, active?.key]);

  if (!ready || !user || user.role === "borrower" || !active) return <main className="px-4 py-16 text-sm">Loading…</main>;

  async function decide(id: string, decision: "approve" | "reject") {
    setError("");
    setNotice("");
    try {
      await api(`/api/sanction/loans/${id}/decision`, { method: "POST", json: { decision, reason } });
      setRejecting(null);
      setReason("");
      setNotice(decision === "approve" ? "Loan sanctioned." : "Loan rejected.");
      await load("sanction");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Decision failed");
    }
  }

  async function disburse(id: string) {
    setError("");
    try {
      await api(`/api/disbursement/loans/${id}/disburse`, { method: "POST", json: {} });
      setNotice("Funds marked as disbursed.");
      await load("disbursement");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Disbursement failed");
    }
  }

  async function recordPayment(id: string, outstanding: number) {
    setError("");
    try {
      const result = await api<{ status: string }>(`/api/collection/loans/${id}/payments`, {
        method: "POST",
        json: { utr, amount: Number(payAmount || outstanding), paidOn },
      });
      setUtr("");
      setPayAmount("");
      setPaying(null);
      setNotice(result.status === "closed" ? "Payment recorded. The loan is closed." : "Payment recorded.");
      await load("collection");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment failed");
    }
  }

  return (
    <>
      <TopBar user={user} onLogout={logout} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap gap-2">
          {visible.map((module) => (
            <button
              key={module.key}
              onClick={() => setModuleKey(module.key)}
              className={`rounded-full px-4 py-2 text-sm ${module.key === active.key ? "bg-ink text-white" : "bg-[#fffdf8]"}`}
            >
              {module.label}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {error ? <Banner tone="error">{error}</Banner> : null}
          {notice ? <Banner tone="ok">{notice}</Banner> : null}
        </div>

        {active.key === "sales" ? (
          <section className="mt-6">
            <h1 className="font-display text-4xl">Leads</h1>
            <p className="mt-1 text-sm text-[#5e564e]">Registered borrowers who have not submitted a loan yet.</p>
            <div className="mt-4 overflow-x-auto rounded-3xl bg-[#fffdf8] shadow-card">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[#7a7168]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Profile</th>
                    <th className="px-4 py-3 font-medium">Eligibility</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr><td className="px-4 py-6" colSpan={4}>No open leads.</td></tr>
                  ) : leads.map((lead) => (
                    <tr key={lead.id} className="border-t border-[#efe7dc]">
                      <td className="px-4 py-3">{lead.name}</td>
                      <td className="px-4 py-3">{lead.email}</td>
                      <td className="px-4 py-3">{lead.profileComplete ? "Started" : "Signup only"}</td>
                      <td className="px-4 py-3">{lead.brePassed === null ? "Not checked" : lead.brePassed ? "Passed" : lead.breReasons[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {active.key !== "sales" ? (
          <section className="mt-6 space-y-4">
            <h1 className="font-display text-4xl">{active.label}</h1>
            {loans.length === 0 ? <p className="text-sm text-[#5e564e]">Nothing is waiting in this queue.</p> : null}
            {loans.map((loan) => (
              <article key={loan.id} className="rounded-3xl bg-[#fffdf8] p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium">{loan.borrower?.fullName}</h2>
                    <p className="text-sm text-[#5e564e]">{loan.borrower?.email} · {loan.borrower?.pan} · {employmentLabel(loan.borrower?.employmentMode)}</p>
                  </div>
                  <StatusPill status={loan.status} />
                </div>
                <p className="mt-3 text-sm">
                  {inr(loan.amount)} · {loan.tenureDays} days · interest {inr(loan.simpleInterest)} · total {inr(loan.totalRepayment)}
                  {loan.borrower?.monthlySalary ? ` · salary ${inr(loan.borrower.monthlySalary)}` : ""}
                </p>
                {loan.borrower?.salarySlip ? (
                  <button className="mt-2 text-sm text-pine underline" onClick={() => openProtectedFile(loan.borrower!.salarySlip!.filename)}>
                    View salary slip
                  </button>
                ) : null}

                {active.key === "sanction" ? (
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <PrimaryButton onClick={() => decide(loan.id, "approve")}>Approve</PrimaryButton>
                    {rejecting === loan.id ? (
                      <>
                        <Field label="Rejection reason">
                          <input className={controlClass} value={reason} onChange={(event) => setReason(event.target.value)} />
                        </Field>
                        <PrimaryButton onClick={() => decide(loan.id, "reject")}>Confirm reject</PrimaryButton>
                      </>
                    ) : (
                      <button className="rounded-full border border-clay px-5 py-2.5 text-sm text-clay" onClick={() => setRejecting(loan.id)}>Reject</button>
                    )}
                  </div>
                ) : null}

                {active.key === "disbursement" ? (
                  <div className="mt-4">
                    <PrimaryButton onClick={() => disburse(loan.id)}>Mark disbursed</PrimaryButton>
                  </div>
                ) : null}

                {active.key === "collection" ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm">Paid {inr(loan.paid)}. Outstanding {inr(loan.outstanding)}.</p>
                    {loan.payments && loan.payments.length > 0 ? (
                      <ul className="text-sm text-[#5e564e]">
                        {loan.payments.map((payment) => (
                          <li key={payment.id}>{payment.paidOn} · {payment.utr} · {inr(payment.amount)}</li>
                        ))}
                      </ul>
                    ) : null}
                    {loan.status === "disbursed" ? (
                      paying === loan.id ? (
                        <div className="grid gap-3 sm:grid-cols-4">
                          <Field label="UTR">
                            <input className={controlClass} value={utr} onChange={(event) => setUtr(event.target.value.toUpperCase())} />
                          </Field>
                          <Field label="Amount">
                            <input className={controlClass} type="number" value={payAmount} placeholder={String(loan.outstanding)} onChange={(event) => setPayAmount(event.target.value)} />
                          </Field>
                          <Field label="Date">
                            <input className={controlClass} type="date" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} />
                          </Field>
                          <div className="flex items-end">
                            <PrimaryButton onClick={() => recordPayment(loan.id, loan.outstanding)}>Save payment</PrimaryButton>
                          </div>
                        </div>
                      ) : (
                        <PrimaryButton onClick={() => { setPaying(loan.id); setPayAmount(String(loan.outstanding)); }}>Record payment</PrimaryButton>
                      )
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}
      </main>
    </>
  );
}
