"use client";

import { create } from "zustand";

/**
 * Admin session: access token lives in memory only; the httpOnly refresh
 * cookie (scoped to /api/auth) restores it across reloads via silent refresh.
 */
export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: string;
}

interface AdminAuthState {
  token: string | null;
  user: AdminUser | null;
  status: "unknown" | "authed" | "guest";
  setSession: (token: string, user: AdminUser) => void;
  clear: () => void;
}

export const useAdminAuth = create<AdminAuthState>((set) => ({
  token: null,
  user: null,
  status: "unknown",
  setSession: (token, user) => set({ token, user, status: "authed" }),
  clear: () => set({ token: null, user: null, status: "guest" }),
}));

const STAFF_ROLES = ["SUPER_ADMIN", "MANAGER"];

export const isStaff = (user: AdminUser | null) => !!user && STAFF_ROLES.includes(user.role);

/** Silent refresh — returns true when a staff session was restored. */
export async function tryRestoreSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    const body = await res.json();
    if (body.success && STAFF_ROLES.includes(body.data.user.role)) {
      useAdminAuth.getState().setSession(body.data.accessToken, body.data.user);
      return true;
    }
  } catch {
    // network failure → treat as guest
  }
  useAdminAuth.getState().clear();
  return false;
}

/** Authorized fetch with one automatic refresh-and-retry on 401. */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = () =>
    fetch(input, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${useAdminAuth.getState().token}`,
      },
    });

  let res = await doFetch();
  if (res.status === 401) {
    const restored = await tryRestoreSession();
    if (restored) res = await doFetch();
  }
  return res;
}

/** Unwrap the API envelope; throws Error(message) on failure. */
export async function adminJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await adminFetch(input, init);
  const body = await res.json();
  if (!body.success) throw new Error(body.error?.message ?? "Request failed");
  return body.data as T;
}
