"use client";

import { create } from "zustand";

/** Storefront session (customer or wholesaler). Token in memory; refresh cookie restores. */
export interface StoreUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: string;
}

interface StoreAuthState {
  token: string | null;
  user: StoreUser | null;
  status: "unknown" | "authed" | "guest";
  setSession: (token: string, user: StoreUser) => void;
  clear: () => void;
}

export const useStoreAuth = create<StoreAuthState>((set) => ({
  token: null,
  user: null,
  status: "unknown",
  setSession: (token, user) => set({ token, user, status: "authed" }),
  clear: () => set({ token: null, user: null, status: "guest" }),
}));

export async function restoreStoreSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    const body = await res.json();
    if (body.success) {
      useStoreAuth.getState().setSession(body.data.accessToken, body.data.user);
      return true;
    }
  } catch {
    // treat as guest
  }
  useStoreAuth.getState().clear();
  return false;
}

export async function storeFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = () =>
    fetch(input, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${useStoreAuth.getState().token}`,
      },
    });
  let res = await doFetch();
  if (res.status === 401) {
    if (await restoreStoreSession()) res = await doFetch();
  }
  return res;
}

export async function storeJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await storeFetch(input, init);
  const body = await res.json();
  if (!body.success) throw new Error(body.error?.message ?? "Request failed");
  return body.data as T;
}
