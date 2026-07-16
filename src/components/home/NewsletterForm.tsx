"use client";

import { useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setState("error");
      return;
    }
    // Subscription endpoint lands with the CMS phase; acknowledge locally.
    setState("done");
  };

  if (state === "done") {
    return (
      <p className="flex items-center gap-2 text-ink-950">
        <CheckCircle size={20} weight="fill" className="text-gold-700" />
        You&apos;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="you@example.com"
          className="flex-1 px-5 py-3.5 rounded-full bg-ivory-50 border border-ivory-300 text-ink-950 placeholder:text-ink-400 text-sm focus:border-gold-600"
        />
        <button
          type="submit"
          className="px-7 py-3.5 rounded-full bg-gold-700 text-white text-sm font-semibold hover:bg-gold-800 transition-colors active:scale-[0.98] whitespace-nowrap"
        >
          Subscribe
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 text-sm text-red-400">Please enter a valid email address.</p>
      )}
    </form>
  );
}
