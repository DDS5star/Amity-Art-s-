"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStoreAuth, restoreStoreSession, storeJson } from "@/components/account/auth";
import { AddressFields, EMPTY_ADDRESS, toAddressPayload, type AddressValues } from "@/components/account/AddressFields";
import { resolveTier, applyTier, validateWholesaleQty, type Tier } from "@/lib/pricing";
import { round2, formatINR } from "@/lib/money";

/**
 * Excel-style wholesale ordering (Mortantra/B2B pattern):
 * rows = product (× colour/plating group), one qty column per size,
 * live totals, tier pricing on the row's total quantity, arrow-key nav.
 */

interface Cell {
  size: string | null;
  variantId: string | null;
  stockQty: number;
}
interface GridRow {
  productId: string;
  matrixKey: string | null;
  name: string;
  sku: string;
  image: string | null;
  weightGrams: number | null;
  taxRatePercent: number;
  basePrice: number;
  moq: number;
  packSize: number;
  tiers: { minQty: number; price: number | null; discountPercent: number | null }[];
  cells: Cell[];
}
interface Catalog {
  sizeColumns: string[];
  rows: GridRow[];
}

type Quantities = Record<string, number>; // `${rowIdx}:${cellIdx}` -> qty

const rowKey = (r: GridRow) => `${r.productId}:${r.matrixKey ?? ""}`;

export default function WholesaleOrderPage() {
  const router = useRouter();
  const { status, user } = useStoreAuth();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [qty, setQty] = useState<Quantities>({});
  const [loadError, setLoadError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [review, setReview] = useState(false);
  const [address, setAddress] = useState<AddressValues>(EMPTY_ADDRESS);
  const [payment, setPayment] = useState<"PAY_LATER" | "COD">("PAY_LATER");
  const gridRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (status === "unknown") void restoreStoreSession();
    if (status === "authed") {
      storeJson<Catalog>("/api/wholesale/catalog").then(setCatalog).catch((e) => setLoadError(e.message));
    }
  }, [status]);

  // Row computations: group qty, tier price, validation, line totals.
  const rowStats = useMemo(() => {
    if (!catalog) return new Map<string, { qty: number; unitPrice: number; amount: number; weight: number; issue: string | null }>();
    const map = new Map();
    catalog.rows.forEach((row, ri) => {
      const rowQty = row.cells.reduce((s, _, ci) => s + (qty[`${ri}:${ci}`] ?? 0), 0);
      const tiers: Tier[] = row.tiers.map((t) => ({ scope: "PRODUCT", ...t }));
      const unitPrice = applyTier(row.basePrice, resolveTier(tiers, rowQty));
      const check = rowQty > 0 ? validateWholesaleQty(rowQty, row.moq, row.packSize) : { ok: true as const };
      map.set(rowKey(row), {
        qty: rowQty,
        unitPrice,
        amount: round2(unitPrice * rowQty),
        weight: row.weightGrams ? round2(row.weightGrams * rowQty) : 0,
        issue: "reason" in check ? check.reason : null,
      });
    });
    return map;
  }, [catalog, qty]);

  const totals = useMemo(() => {
    let pieces = 0, amount = 0, weight = 0, gst = 0;
    const issues: string[] = [];
    catalog?.rows.forEach((row) => {
      const s = rowStats.get(rowKey(row))!;
      if (!s || s.qty === 0) return;
      pieces += s.qty;
      amount += s.amount;
      weight += s.weight;
      gst += (s.amount * row.taxRatePercent) / 100; // wholesale = tax-exclusive
      if (s.issue) issues.push(`${row.name}: ${s.issue}`);
    });
    return {
      pieces,
      amount: round2(amount),
      weight: round2(weight),
      gst: round2(gst),
      grand: round2(amount + gst),
      issues,
    };
  }, [catalog, rowStats]);

  // Arrow-key navigation between qty cells.
  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const pos = target.getAttribute("data-cell");
    if (!pos || !catalog) return;
    const [ri, ci] = pos.split(":").map(Number);
    let next: [number, number] | null = null;
    if (e.key === "ArrowDown" || e.key === "Enter") next = [ri + 1, ci];
    if (e.key === "ArrowUp") next = [ri - 1, ci];
    if (e.key === "ArrowRight" && (target as HTMLInputElement).selectionStart === (target as HTMLInputElement).value.length) next = [ri, ci + 1];
    if (e.key === "ArrowLeft" && (target as HTMLInputElement).selectionStart === 0) next = [ri, ci - 1];
    if (!next) return;
    const el = gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${next[0]}:${next[1]}"]`);
    if (el) {
      e.preventDefault();
      el.focus();
      el.select();
    }
  };

  const place = async () => {
    if (!catalog) return;
    setPlacing(true);
    setPlaceError("");
    try {
      const lines: { productId: string; variantId?: string; quantity: number }[] = [];
      catalog.rows.forEach((row, ri) => {
        row.cells.forEach((cell, ci) => {
          const q = qty[`${ri}:${ci}`] ?? 0;
          if (q > 0) {
            lines.push({ productId: row.productId, variantId: cell.variantId ?? undefined, quantity: q });
          }
        });
      });
      const order = await storeJson<{ id: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          lines,
          shippingAddress: toAddressPayload(address),
          paymentMethod: payment,
        }),
      });
      router.replace(`/orders/${order.id}?placed=1`);
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : "Could not place the order");
      setPlacing(false);
    }
  };

  if (status === "guest") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-ink-950">Wholesale ordering</h1>
        <p className="mt-3 text-ink-500 text-sm">Sign in with your approved wholesale account.</p>
        <Link href="/account/login?next=/wholesale/order" className="mt-6 inline-block px-7 py-3.5 rounded-full bg-gold-700 text-white text-sm font-semibold hover:bg-gold-800">
          Sign in
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-ink-950">Wholesale ordering</h1>
        <p className="mt-4 text-sm text-red-600">{loadError}</p>
        <p className="mt-2 text-sm text-ink-500">
          Not a partner yet?{" "}
          <Link href="/wholesale" className="text-gold-700 underline underline-offset-4">Apply here</Link>.
        </p>
      </div>
    );
  }

  if (!catalog) {
    return <div className="max-w-7xl mx-auto px-4 py-24 text-sm text-ink-400">Loading price list…</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 pb-36">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl text-ink-950">Order sheet</h1>
          <p className="mt-2 text-sm text-ink-500">
            Type quantities per size — arrow keys move between cells. Tier
            discounts apply automatically on each row&apos;s total.
          </p>
        </div>
        <p className="text-sm text-ink-400">Signed in as {user?.firstName}</p>
      </div>

      <div className="mt-8 bg-white rounded-xl border border-ivory-200 overflow-x-auto">
        <table ref={gridRef} onKeyDown={onGridKeyDown} className="w-full text-sm min-w-[880px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-ivory-200 bg-ivory-50">
              <th className="px-4 py-3 font-medium w-[320px]">Design</th>
              {catalog.sizeColumns.map((s) => (
                <th key={s} className="px-2 py-3 font-medium text-center w-20">Size {s}</th>
              ))}
              <th className="px-2 py-3 font-medium text-center w-20">Qty</th>
              <th className="px-3 py-3 font-medium text-right w-28">Rate</th>
              <th className="px-4 py-3 font-medium text-right w-32">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {catalog.rows.map((row, ri) => {
              const stats = rowStats.get(rowKey(row))!;
              const cellFor = (size: string) => row.cells.findIndex((c) => c.size === size);
              const singleCell = row.cells.length === 1 && row.cells[0].size === null;
              return (
                <tr key={rowKey(row)} className={stats.qty > 0 ? "bg-gold-100/20" : undefined}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {row.image ? (
                        <Image src={row.image} alt="" width={44} height={55} className="w-11 h-[55px] rounded-md object-cover bg-ivory-100" />
                      ) : (
                        <div className="w-11 h-[55px] rounded-md bg-ivory-100" />
                      )}
                      <div className="min-w-0">
                        <p className="text-ink-950 line-clamp-1">{row.name}</p>
                        <p className="text-xs text-ink-400">
                          {row.sku} · MOQ {row.moq}
                          {row.packSize > 1 ? ` · packs of ${row.packSize}` : ""}
                        </p>
                        {stats.issue && <p className="text-xs text-red-600 mt-0.5">{stats.issue}</p>}
                      </div>
                    </div>
                  </td>
                  {catalog.sizeColumns.map((size, colIdx) => {
                    const ci = singleCell ? (colIdx === 0 ? 0 : -1) : cellFor(size);
                    if (ci === -1) {
                      return <td key={size} className="px-2 py-3 text-center text-ink-400">—</td>;
                    }
                    const cell = row.cells[ci];
                    const val = qty[`${ri}:${ci}`] ?? "";
                    return (
                      <td key={size} className="px-2 py-3 text-center">
                        <input
                          data-cell={`${ri}:${ci}`}
                          inputMode="numeric"
                          aria-label={`${row.name} size ${size} quantity`}
                          value={val}
                          onChange={(e) => {
                            const n = Math.min(9999, Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0));
                            setQty((q) => ({ ...q, [`${ri}:${ci}`]: n }));
                          }}
                          onFocus={(e) => e.target.select()}
                          className={`w-16 px-2 py-2 rounded-lg border text-center text-sm focus:border-gold-600 ${
                            (qty[`${ri}:${ci}`] ?? 0) > 0 ? "border-gold-600 bg-gold-100/40 font-medium" : "border-ivory-300 bg-white"
                          }`}
                        />
                        <p className="mt-1 text-[10px] text-ink-400">{cell.stockQty} avl</p>
                      </td>
                    );
                  })}
                  <td className="px-2 py-3 text-center font-medium text-ink-950">{stats.qty || ""}</td>
                  <td className="px-3 py-3 text-right text-ink-700">
                    {formatINR(stats.unitPrice)}
                    {stats.unitPrice < row.basePrice && (
                      <p className="text-[10px] text-emerald-700">tier applied</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-ink-950">
                    {stats.amount ? formatINR(stats.amount) : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sticky totals bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-ivory-200 shadow-[0_-8px_24px_-16px_rgb(25_22_18/0.25)]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center gap-6 flex-wrap">
          <div className="flex gap-6 text-sm">
            <p><span className="text-ink-400">Pieces</span> <span className="font-semibold text-ink-950">{totals.pieces}</span></p>
            <p><span className="text-ink-400">Weight</span> <span className="font-semibold text-ink-950">{totals.weight >= 1000 ? `${round2(totals.weight / 1000)} kg` : `${totals.weight} g`}</span></p>
            <p><span className="text-ink-400">Subtotal</span> <span className="font-semibold text-ink-950">{formatINR(totals.amount)}</span></p>
            <p><span className="text-ink-400">GST</span> <span className="font-semibold text-ink-950">{formatINR(totals.gst)}</span></p>
            <p><span className="text-ink-400">Total</span> <span className="font-semibold text-gold-800">{formatINR(totals.grand)}</span></p>
          </div>
          <button
            type="button"
            disabled={totals.pieces === 0 || totals.issues.length > 0}
            onClick={() => setReview(true)}
            className="ml-auto px-7 py-3 rounded-full bg-gold-700 text-white text-sm font-semibold hover:bg-gold-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Review order
          </button>
        </div>
        {totals.issues.length > 0 && (
          <p className="max-w-7xl mx-auto px-4 md:px-8 pb-2 text-xs text-red-600">{totals.issues[0]}</p>
        )}
      </div>

      {/* Review sheet */}
      {review && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-6" role="dialog" aria-label="Review order">
          <div className="bg-white w-full max-w-2xl rounded-t-2xl md:rounded-2xl max-h-[90dvh] overflow-y-auto p-6 md:p-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-ink-950">Review &amp; place order</h2>
              <button type="button" onClick={() => setReview(false)} className="text-sm text-ink-500 hover:text-ink-950 cursor-pointer">
                Back to sheet
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-ivory-100 p-4 text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
              <p><span className="block text-xs text-ink-400">Pieces</span>{totals.pieces}</p>
              <p><span className="block text-xs text-ink-400">Subtotal</span>{formatINR(totals.amount)}</p>
              <p><span className="block text-xs text-ink-400">GST</span>{formatINR(totals.gst)}</p>
              <p><span className="block text-xs text-ink-400">Grand total*</span><span className="font-semibold">{formatINR(totals.grand)}</span></p>
            </div>
            <p className="mt-2 text-xs text-ink-400">*Shipping added per your pincode zone at confirmation.</p>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-ink-950 mb-3">Delivery address</h3>
              <AddressFields values={address} onChange={setAddress} />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-ink-950 mb-3">Payment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer ${payment === "PAY_LATER" ? "border-gold-600 bg-gold-100/40" : "border-ivory-300"}`}>
                  <input type="radio" checked={payment === "PAY_LATER"} onChange={() => setPayment("PAY_LATER")} className="accent-gold-700 mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium text-ink-950">Pay later (credit)</span>
                    <span className="block text-xs text-ink-500">Skip payment now, settle within your credit days.</span>
                  </span>
                </label>
                <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer ${payment === "COD" ? "border-gold-600 bg-gold-100/40" : "border-ivory-300"}`}>
                  <input type="radio" checked={payment === "COD"} onChange={() => setPayment("COD")} className="accent-gold-700 mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium text-ink-950">Cash on delivery</span>
                    <span className="block text-xs text-ink-500">Pay the courier on receipt.</span>
                  </span>
                </label>
              </div>
            </div>

            {placeError && <p className="mt-4 text-sm text-red-600">{placeError}</p>}

            <button
              type="button"
              disabled={placing}
              onClick={place}
              className="cta-shimmer mt-6 w-full py-3.5 rounded-full bg-gold-700 text-white text-sm font-semibold hover:bg-gold-800 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {placing ? "Placing order…" : `Place order · ${formatINR(totals.grand)} + shipping`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
