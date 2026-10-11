"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth";

export default function HomePage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else router.replace(user.role === "borrower" ? "/apply" : "/dashboard");
  }, [ready, user, router]);

  return <main className="px-4 py-16 text-sm text-[#7a7168]">Opening Loan Desk…</main>;
}
