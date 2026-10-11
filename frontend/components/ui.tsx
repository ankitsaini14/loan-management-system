import Link from "next/link";
import type { AuthUser } from "@/lib/api";

export function TopBar({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <header className="border-b border-[#e4dccf] bg-[#fffdf8]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href={user.role === "borrower" ? "/apply" : "/dashboard"} className="font-display text-2xl text-ink">
          Loan Desk
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right">
            <p className="font-medium">{user.name}</p>
            <p className="uppercase tracking-wide text-[#7a7168]">{user.role}</p>
          </div>
          <button onClick={onLogout} className="rounded-full border border-[#d9d0c3] px-3 py-1.5 hover:bg-[#f6f1e8]">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

export function Banner({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  const styles = tone === "error" ? "bg-[#fde8e4] text-clay" : "bg-[#e5f4ec] text-pine";
  return <div className={`rounded-2xl px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export const controlClass =
  "w-full rounded-xl border border-[#ddd4c6] bg-white px-3 py-2.5 outline-none ring-pine focus:ring-2";

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-full bg-pine px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    applied: "bg-[#fff1d6] text-[#8a5a12]",
    sanctioned: "bg-[#e7eefc] text-[#244e9b]",
    disbursed: "bg-[#e5f4ec] text-pine",
    rejected: "bg-[#fde8e4] text-clay",
    closed: "bg-[#ece7df] text-[#4d463f]",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium uppercase ${tones[status] ?? tones.closed}`}>{status}</span>;
}
