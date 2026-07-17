"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { useAdminAuth, isStaff } from "@/components/admin/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const setSession = useAdminAuth((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!body.success) throw new Error(body.error?.message ?? "Login failed");
      if (!isStaff(body.data.user)) {
        throw new Error("This account does not have admin access");
      }
      setSession(body.data.accessToken, body.data.user);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-ivory-100 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image src="/brand/logo.png" alt="Amity Arts" width={220} height={111} priority className="h-16 w-auto" />
        </div>
        <form
          onSubmit={submit}
          className="bg-white rounded-2xl border border-ivory-200 p-8 shadow-[0_12px_40px_-24px_rgb(25_22_18/0.3)]"
        >
          <h1 className="font-display text-2xl text-ink-950">Admin sign in</h1>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-ink-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-ivory-300 bg-white text-ink-950 text-sm focus:border-gold-600"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm text-ink-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-ivory-300 bg-white text-ink-950 text-sm focus:border-gold-600"
              />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-3 rounded-lg bg-ink-950 text-white text-sm font-semibold hover:bg-ink-800 transition-colors active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
