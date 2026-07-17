"use client";

import { useState } from "react";
import { adminJson } from "@/components/admin/auth";
import type { AdminVariant } from "./VariantsPanel";

const REASONS = [
  { value: "PURCHASE_INWARD", label: "Purchase inward (restock)" },
  { value: "MANUAL_ADJUSTMENT", label: "Manual adjustment" },
  { value: "RETURN_RESTOCK", label: "Return restock" },
  { value: "DAMAGE", label: "Damage / write-off" },
  { value: "CORRECTION", label: "Count correction" },
] as const;

const input =
  "w-full px-3 py-2 rounded-lg border border-ivory-300 bg-white text-sm text-ink-950 focus:border-gold-600";

/** Manual stock movements — every change writes an audited ledger row. */
export function StockAdjuster({
  productId,
  productStock,
  variants,
  onChanged,
}: {
  productId: string;
  productStock: number;
  variants: AdminVariant[];
  onChanged: () => Promise<void>;
}) {
  const [variantId, setVariantId] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("PURCHASE_INWARD");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const apply = async () => {
    const d = Number(delta);
    if (!Number.isInteger(d) || d === 0) {
      setMessage({ kind: "err", text: "Enter a non-zero whole number (negative removes stock)." });
      return;
    }
    if (variants.length > 0 && !variantId) {
      setMessage({ kind: "err", text: "This product has variants — pick which one to adjust." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await adminJson<{ stockAfter: number }>(
        `/api/admin/products/${productId}/stock`,
        {
          method: "POST",
          body: JSON.stringify({
            delta: d,
            reason,
            note: note || undefined,
            variantId: variantId || undefined,
          }),
        },
      );
      setMessage({ kind: "ok", text: `Done — stock is now ${result.stockAfter}.` });
      setDelta("");
      setNote("");
      await onChanged();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Adjustment failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-ivory-200 p-5 h-fit">
      <h2 className="text-sm font-semibold text-ink-950">Adjust stock</h2>
      <p className="mt-1 text-xs text-ink-400">
        Total on hand: <span className="font-medium text-ink-700">{productStock}</span>. Every
        change is recorded in the movement ledger.
      </p>

      <div className="mt-4 space-y-3">
        {variants.length > 0 && (
          <div>
            <label className="block text-xs text-ink-500 mb-1" htmlFor="adj-variant">Variant</label>
            <select id="adj-variant" className={input} value={variantId} onChange={(e) => setVariantId(e.target.value)}>
              <option value="">Select variant…</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} ({v.stockQty} in stock)
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs text-ink-500 mb-1" htmlFor="adj-delta">Quantity (+ add / − remove)</label>
          <input id="adj-delta" className={input} inputMode="numeric" placeholder="e.g. 24 or -3" value={delta} onChange={(e) => setDelta(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1" htmlFor="adj-reason">Reason</label>
          <select id="adj-reason" className={input} value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1" htmlFor="adj-note">Note (optional)</label>
          <input id="adj-note" className={input} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {message && (
          <p className={`text-sm ${message.kind === "ok" ? "text-emerald-700" : "text-red-600"}`}>
            {message.text}
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={apply}
          className="w-full py-2.5 rounded-lg bg-ink-950 text-white text-sm font-medium hover:bg-ink-800 disabled:opacity-60 cursor-pointer"
        >
          {busy ? "Applying…" : "Apply movement"}
        </button>
      </div>
    </section>
  );
}
