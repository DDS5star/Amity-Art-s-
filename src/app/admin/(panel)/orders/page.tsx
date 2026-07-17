"use client";

import { useCallback, useEffect, useState } from "react";
import { adminJson } from "@/components/admin/auth";
import { formatINR } from "@/lib/money";

interface Row {
  id: string;
  orderNumber: string;
  channel: "RETAIL" | "WHOLESALE";
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: string;
  placedAt: string;
  dueDate: string | null;
  user: { firstName: string; lastName: string | null; email: string };
  _count: { items: number };
}

const NEXT_ACTIONS: Record<string, { status: string; label: string }[]> = {
  PENDING: [{ status: "PROCESSING", label: "Start processing" }],
  CONFIRMED: [{ status: "PROCESSING", label: "Start processing" }],
  PROCESSING: [{ status: "PACKED", label: "Mark packed" }],
  PACKED: [{ status: "SHIPPED", label: "Mark shipped" }],
  SHIPPED: [{ status: "DELIVERED", label: "Mark delivered" }],
  OUT_FOR_DELIVERY: [{ status: "DELIVERED", label: "Mark delivered" }],
};

const FILTERS = ["ALL", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export default function AdminOrdersPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [tracking, setTracking] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setRows(null);
    const q = filter === "ALL" ? "" : `&status=${filter}`;
    const data = await adminJson<{ items: Row[] }>(`/api/admin/orders?limit=50${q}`);
    setRows(data.items);
  }, [filter]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const act = async (id: string, status: string, markPaid?: boolean) => {
    setError("");
    try {
      await adminJson(`/api/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ...(status === "SHIPPED" && tracking[id] ? { trackingNumber: tracking[id] } : {}),
          ...(markPaid ? { markPaid: true } : {}),
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  const markPaid = async (id: string, currentStatus: string) => {
    setError("");
    try {
      // markPaid rides on a status PATCH; reuse the current → same-status legal move.
      const next = NEXT_ACTIONS[currentStatus]?.[0]?.status;
      if (!next) return;
      await adminJson(`/api/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next, markPaid: true, note: "Payment collected" }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink-950">Orders</h1>

      <div className="mt-6 flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm capitalize cursor-pointer transition-colors ${
              filter === f ? "bg-ink-950 text-white" : "bg-white border border-ivory-300 text-ink-700"
            }`}
          >
            {f.toLowerCase()}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {rows === null ? (
          <p className="text-sm text-ink-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-400 bg-white border border-ivory-200 rounded-xl px-5 py-8">
            No {filter === "ALL" ? "" : filter.toLowerCase() + " "}orders yet.
          </p>
        ) : (
          rows.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-ivory-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-semibold text-ink-950">{o.orderNumber}</p>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${o.channel === "WHOLESALE" ? "bg-ink-950 text-white" : "bg-ivory-100 text-ink-700"}`}>
                      {o.channel === "WHOLESALE" ? "B2B" : "Retail"}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gold-100 text-gold-800">
                      {o.status.replaceAll("_", " ")}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${o.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {o.paymentMethod === "PAY_LATER" ? "Pay later" : o.paymentMethod} · {o.paymentStatus.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-500">
                    {o.user.firstName} {o.user.lastName ?? ""} · {o.user.email} · {o._count.items} item{o._count.items > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {new Date(o.placedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {o.dueDate ? ` · payment due ${new Date(o.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-ink-950">{formatINR(Number(o.totalAmount))}</p>
                  <div className="mt-2 flex items-center gap-2 justify-end flex-wrap">
                    {o.status === "PACKED" && (
                      <input
                        placeholder="Tracking no."
                        className="w-32 px-3 py-1.5 rounded-lg border border-ivory-300 text-xs"
                        value={tracking[o.id] ?? ""}
                        onChange={(e) => setTracking((t) => ({ ...t, [o.id]: e.target.value }))}
                      />
                    )}
                    {(NEXT_ACTIONS[o.status] ?? []).map((a) => (
                      <button
                        key={a.status}
                        type="button"
                        onClick={() => act(o.id, a.status)}
                        className="px-4 py-1.5 rounded-lg bg-ink-950 text-white text-xs font-medium hover:bg-ink-800 cursor-pointer"
                      >
                        {a.label}
                      </button>
                    ))}
                    {o.paymentStatus !== "PAID" && NEXT_ACTIONS[o.status] && (
                      <button
                        type="button"
                        onClick={() => markPaid(o.id, o.status)}
                        className="px-4 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 text-xs font-medium hover:bg-emerald-50 cursor-pointer"
                      >
                        Advance + mark paid
                      </button>
                    )}
                    {["PENDING", "CONFIRMED", "PROCESSING", "PACKED"].includes(o.status) && (
                      <button
                        type="button"
                        onClick={() => act(o.id, "CANCELLED")}
                        className="px-4 py-1.5 rounded-lg border border-ivory-300 text-ink-500 text-xs hover:border-red-300 hover:text-red-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
