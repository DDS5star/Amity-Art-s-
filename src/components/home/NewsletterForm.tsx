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
      <p className="flex items-center gap-2 text-bone-100">
        <CheckCircle size={20} weight="fill" className="text-amber-accent" />
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
          className="flex-1 px-5 py-3.5 rounded-full bg-forest-950 border border-forest-700 text-bone-100 placeholder:text-bone-600 text-sm focus:border-amber-accent"
        />
        <button
          type="submit"
          className="px-7 py-3.5 rounded-full bg-amber-accent text-forest-950 text-sm font-semibold hover:bg-amber-soft transition-colors active:scale-[0.98] whitespace-nowrap"
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
