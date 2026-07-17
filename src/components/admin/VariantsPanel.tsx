"use client";

import { useEffect, useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { adminJson } from "@/components/admin/auth";
import { formatINR } from "@/lib/money";

export interface AdminVariant {
  id: string;
  sku: string;
  title: string;
  stockQty: number;
  retailPrice: string | null;
  wholesalePrice: string | null;
  isActive: boolean;
}

interface Attribute {
  id: string;
  name: string;
  code: string;
  values: { id: string; value: string; code: string }[];
}

const input =
  "px-3 py-2 rounded-lg border border-ivory-300 bg-white text-sm text-ink-950 focus:border-gold-600";

export function VariantsPanel({
  productId,
  variants,
  onChanged,
}: {
  productId: string;
  variants: AdminVariant[];
  onChanged: () => Promise<void>;
}) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [adding, setAdding] = useState(false);
  const [selection, setSelection] = useState<Record<string, string>>({}); // attributeId -> valueId
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<Attribute[]>("/api/admin/attributes").then(setAttributes).catch(() => {});
  }, []);

  const create = async () => {
    const attributeValueIds = Object.values(selection).filter(Boolean);
    if (attributeValueIds.length === 0) {
      setError("Pick at least one attribute value");
      return;
    }
    if (!sku.trim()) {
      setError("Variant SKU is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await adminJson(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify({
          sku: sku.trim(),
          attributeValueIds,
          stockQty: Number(stock) || 0,
        }),
      });
      setAdding(false);
      setSelection({});
      setSku("");
      setStock("0");
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create variant");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-ivory-200">
      <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-950">Variants ({variants.length})</h2>
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          className="inline-flex items-center gap-1.5 text-sm text-gold-700 hover:text-gold-800 cursor-pointer"
        >
          <Plus size={14} /> {adding ? "Cancel" : "Add variant"}
        </button>
      </div>

      {adding && (
        <div className="px-5 py-4 border-b border-ivory-200 bg-ivory-50 space-y-3">
          <div className="flex flex-wrap gap-3">
            {attributes.map((a) => (
              <div key={a.id}>
                <label className="block text-xs text-ink-500 mb-1">{a.name}</label>
                <select
                  className={input}
                  value={selection[a.id] ?? ""}
                  onChange={(e) => setSelection((s) => ({ ...s, [a.id]: e.target.value }))}
                >
                  <option value="">—</option>
                  {a.values.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.value}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div>
              <label className="block text-xs text-ink-500 mb-1">SKU</label>
              <input className={input} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="AA-XXX-0001-G22" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">Opening stock</label>
              <input className={`${input} w-24`} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={create}
            className="px-4 py-2 rounded-lg bg-ink-950 text-white text-sm font-medium hover:bg-ink-800 disabled:opacity-60 cursor-pointer"
          >
            {busy ? "Creating…" : "Create variant"}
          </button>
        </div>
      )}

      {variants.length === 0 ? (
        <p className="px-5 py-8 text-sm text-ink-400">
          No variants — the product sells as a single option. Add one per
          size/plating combination for matrix ordering.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-ivory-200">
              <th className="px-5 py-2.5 font-medium">Variant</th>
              <th className="px-5 py-2.5 font-medium">SKU</th>
              <th className="px-5 py-2.5 font-medium">Stock</th>
              <th className="px-5 py-2.5 font-medium">Price override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {variants.map((v) => (
              <tr key={v.id}>
                <td className="px-5 py-3 text-ink-950">{v.title}</td>
                <td className="px-5 py-3 text-ink-500">{v.sku}</td>
                <td className="px-5 py-3">
                  <span className={v.stockQty === 0 ? "text-red-700 font-medium" : "text-ink-700"}>
                    {v.stockQty}
                  </span>
                </td>
                <td className="px-5 py-3 text-ink-500">
                  {v.retailPrice ? formatINR(Number(v.retailPrice)) : "inherits"}
                  {v.wholesalePrice ? ` / ${formatINR(Number(v.wholesalePrice))} W` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
