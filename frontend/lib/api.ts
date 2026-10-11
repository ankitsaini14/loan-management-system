/** Empty string = same-origin `/api/*` (proxied in next.config.ts). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
export const TOKEN_KEY = "lms_token";

export type Role = "admin" | "sales" | "sanction" | "disbursement" | "collection" | "borrower";

export type AuthUser = {
  id: string;
  role: Role;
  email: string;
  name: string;
};

export class ApiError extends Error {
  status: number;
  reasons: string[];

  constructor(message: string, status: number, reasons: string[] = []) {
    super(message);
    this.status = status;
    this.reasons = reasons;
  }
}

type Options = {
  method?: string;
  json?: unknown;
  body?: FormData;
  redirectOn401?: boolean;
};

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const headers = new Headers();
  const token = typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.json !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    reasons?: string[];
    data?: T;
  };

  if (response.status === 401 && options.redirectOn401 !== false && !path.startsWith("/api/auth/login")) {
    localStorage.removeItem(TOKEN_KEY);
    if (typeof window !== "undefined") window.location.href = "/login";
  }
  if (!response.ok) {
    throw new ApiError(payload.message || "Request failed", response.status, payload.reasons ?? []);
  }
  return payload.data as T;
}

export async function openProtectedFile(filename: string) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}/api/files/${filename}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiError("Could not open the file", response.status);
  const blob = await response.blob();
  window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
}
