"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth, useGuestOnly } from "@/components/auth";
import { Banner, Field, PrimaryButton, controlClass } from "@/components/ui";
import { api, type AuthUser } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  useGuestOnly();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const session = await api<{ token: string; user: AuthUser }>("/api/auth/signup", {
        method: "POST",
        json: { name, email, password },
      });
      setSession(session.token, session.user);
      router.replace("/apply");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the account");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <form onSubmit={onSubmit} className="rounded-3xl bg-[#fffdf8] p-6 shadow-card">
        <h1 className="font-display text-4xl">Create a borrower account</h1>
        <p className="mt-2 text-sm text-[#5e564e]">Staff accounts are already seeded. This form is only for borrowers.</p>
        <div className="mt-5 space-y-4">
          {error ? <Banner tone="error">{error}</Banner> : null}
          <Field label="Name">
            <input className={controlClass} value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Email">
            <input className={controlClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field label="Password">
            <input className={controlClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
          </Field>
          <PrimaryButton disabled={pending}>{pending ? "Creating…" : "Sign up"}</PrimaryButton>
        </div>
        <p className="mt-4 text-sm">
          Already registered? <Link className="text-pine underline" href="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
}
