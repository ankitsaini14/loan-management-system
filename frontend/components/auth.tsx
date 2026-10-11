"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, TOKEN_KEY, type AuthUser } from "@/lib/api";

type AuthState = {
  user: AuthUser | null;
  ready: boolean;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setReady(true);
      return;
    }
    api<AuthUser>("/api/auth/me", { redirectOn401: false })
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setReady(true));
  }, []);

  function setSession(token: string, next: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(next);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, ready, setSession, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}

export function useRequireRole(kind: "borrower" | "staff") {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.user) {
      router.replace("/login");
      return;
    }
    if (kind === "borrower" && auth.user.role !== "borrower") router.replace("/dashboard");
    if (kind === "staff" && auth.user.role === "borrower") router.replace("/apply");
  }, [auth.ready, auth.user, kind, router]);

  return auth;
}
