"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { homePathFor, useAuth, useGuestOnly } from "@/components/auth";
import { Banner, Field, PrimaryButton, controlClass } from "@/components/ui";
import { api, type AuthUser } from "@/lib/api";

const DEMOS = [
  ["Borrower", "borrower@lms.dev", "Borrower@123"],
  ["Sales", "sales@lms.dev", "Sales@123"],
  ["Sanction", "sanction@lms.dev", "Sanction@123"],
  ["Disbursement", "disbursement@lms.dev", "Disburse@123"],
  ["Collection", "collection@lms.dev", "Collect@123"],
  ["Admin", "admin@lms.dev", "Admin@123"],
] as const;

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  useGuestOnly();
  const [email, setEmail] = useState("borrower@lms.dev");
  const [password, setPassword] = useState("Borrower@123");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const session = await api<{ token: string; user: AuthUser }>("/api/auth/login", {
        method: "POST",
        json: { email, password },
        redirectOn401: false,
      });
      setSession(session.token, session.user);
      router.replace(homePathFor(session.user));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2">
      <section>
        <p className="text-sm uppercase tracking-[0.2em] text-pine">Loan management</p>
        <h1 className="mt-3 font-display text-5xl leading-tight">Apply, review, release, and collect.</h1>
        <p className="mt-4 max-w-md text-[#5e564e]">
          Borrowers complete a four-step application. Each internal team only sees the stage they own.
        </p>
      </section>
      <form onSubmit={onSubmit} className="rounded-3xl bg-[#fffdf8] p-6 shadow-card">
        <h2 className="font-display text-3xl">Log in</h2>
        <div className="mt-5 space-y-4">
          {error ? <Banner tone="error">{error}</Banner> : null}
          <Field label="Email">
            <input className={controlClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field label="Password">
            <input className={controlClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </Field>
          <PrimaryButton disabled={pending}>{pending ? "Checking…" : "Log in"}</PrimaryButton>
        </div>
        <p className="mt-4 text-sm text-[#5e564e]">
          New borrower? <Link className="text-pine underline" href="/signup">Create an account</Link>
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          {DEMOS.map(([label, demoEmail, demoPassword]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setEmail(demoEmail);
                setPassword(demoPassword);
              }}
              className="rounded-2xl border border-[#e4dccf] px-3 py-2 text-left text-sm hover:bg-[#f6f1e8]"
            >
              <span className="block font-medium">{label}</span>
              <span className="text-[#7a7168]">{demoEmail}</span>
            </button>
          ))}
        </div>
      </form>
    </main>
  );
}
