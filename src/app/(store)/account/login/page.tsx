"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useStoreAuth } from "@/components/account/auth";

const input =
  "w-full px-4 py-2.5 rounded-lg border border-ivory-300 bg-white text-ink-950 text-sm focus:border-gold-600";
const label = "block text-sm text-ink-700 mb-1.5";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account/orders";
  const setSession = useStoreAuth((s) => s.setSession);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", firstName: "", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : {
              email: form.email,
              password: form.password,
              firstName: form.firstName,
              ...(form.phone ? { phone: form.phone } : {}),
            };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!body.success) throw new Error(body.error?.message ?? "Something went wrong");
      setSession(body.data.accessToken, body.data.user);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 md:py-24">
      <h1 className="font-display text-4xl text-ink-950 text-center">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>

      <div className="mt-8 bg-white rounded-2xl border border-ivory-200 p-8">
        <div className="flex rounded-lg bg-ivory-100 p-1 mb-6">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                mode === m ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"
              }`}
            >
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className={label} htmlFor="acc-name">Your name</label>
                <input id="acc-name" required className={input} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor="acc-phone">Mobile (for order updates on WhatsApp)</label>
                <input id="acc-phone" inputMode="numeric" maxLength={10} placeholder="10-digit number" className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} />
              </div>
            </>
          )}
          <div>
            <label className={label} htmlFor="acc-email">Email</label>
            <input id="acc-email" type="email" required autoComplete="username" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="acc-password">Password</label>
            <input id="acc-password" type="password" required autoComplete={mode === "login" ? "current-password" : "new-password"} className={input} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {mode === "register" && (
              <p className="mt-1 text-xs text-ink-400">10+ characters with upper, lower and a digit.</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-full bg-gold-700 text-white text-sm font-semibold hover:bg-gold-800 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        Buying for a store?{" "}
        <Link href="/wholesale" className="text-gold-700 underline underline-offset-4">
          Apply for a wholesale account
        </Link>
      </p>
    </div>
  );
}

export default function AccountLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
