"use client";

import { useCallback, useEffect, useState } from "react";
import { adminJson, useAdminAuth } from "@/components/admin/auth";

interface Profile {
  id: string;
  companyName: string;
  gstin: string | null;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
  creditLimit: string;
  creditDays: number;
  creditUsed: string;
  createdAt: string;
  user: { id: string; email: string; phone: string | null; firstName: string; lastName: string | null };
}

const STATUSES = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"] as const;

const badge: Record<Profile["status"], string> = {
  PENDING: "bg-gold-100 text-gold-800",
  APPROVED: "bg-emerald-50 text-emerald-700",
  SUSPENDED: "bg-red-50 text-red-700",
  REJECTED: "bg-ivory-100 text-ink-500",
};

export default function AdminWholesalersPage() {
  const role = useAdminAuth((s) => s.user?.role);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("PENDING");
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");
  const [credit, setCredit] = useState<Record<string, { limit: string; days: string }>>({});

  const load = useCallback(async () => {
    setRows(null);
    const data = await adminJson<{ items: Profile[] }>(`/api/admin/wholesalers?status=${status}&limit=50`);
    setRows(data.items);
  }, [status]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const review = async (id: string, action: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE") => {
    setError("");
    try {
      const c = credit[id];
      await adminJson(`/api/admin/wholesalers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action,
          ...(action === "APPROVE" && c?.limit ? { creditLimit: Number(c.limit) } : {}),
          ...(action === "APPROVE" && c?.days ? { creditDays: Number(c.days) } : {}),
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  };

  if (role !== "SUPER_ADMIN") {
    return <p className="text-sm text-ink-500">Only the super admin can review wholesale accounts.</p>;
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink-950">Wholesalers</h1>

      <div className="mt-6 flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-lg text-sm capitalize cursor-pointer transition-colors ${
              status === s ? "bg-ink-950 text-white" : "bg-white border border-ivory-300 text-ink-700"
            }`}
          >
            {s.toLowerCase()}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {rows === null ? (
          <p className="text-sm text-ink-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-400 bg-white border border-ivory-200 rounded-xl px-5 py-8">
            No {status.toLowerCase()} accounts.
          </p>
        ) : (
          rows.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-ivory-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-ink-950">{p.companyName}</p>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${badge[p.status]}`}>{p.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
                    {p.user.firstName} {p.user.lastName ?? ""} · {p.user.email}
                    {p.user.phone ? ` · ${p.user.phone}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    GSTIN: {p.gstin ?? "not provided"} · Applied{" "}
                    {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {p.status === "APPROVED" && (
                    <p className="mt-1 text-xs text-ink-400">
                      Credit: ₹{Number(p.creditUsed).toLocaleString("en-IN")} used of ₹
                      {Number(p.creditLimit).toLocaleString("en-IN")} · {p.creditDays} days
                    </p>
                  )}
                </div>

                <div className="flex items-end gap-2 flex-wrap">
                  {p.status === "PENDING" && (
                    <>
                      <div>
                        <label className="block text-xs text-ink-500 mb-1">Credit limit ₹</label>
                        <input
                          className="w-28 px-3 py-2 rounded-lg border border-ivory-300 text-sm"
                          inputMode="numeric"
                          placeholder="0"
                          value={credit[p.id]?.limit ?? ""}
                          onChange={(e) => setCredit((c) => ({ ...c, [p.id]: { limit: e.target.value, days: c[p.id]?.days ?? "" } }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-ink-500 mb-1">Credit days</label>
                        <input
                          className="w-24 px-3 py-2 rounded-lg border border-ivory-300 text-sm"
                          inputMode="numeric"
                          placeholder="0"
                          value={credit[p.id]?.days ?? ""}
                          onChange={(e) => setCredit((c) => ({ ...c, [p.id]: { limit: c[p.id]?.limit ?? "", days: e.target.value } }))}
                        />
                      </div>
                      <button type="button" onClick={() => review(p.id, "APPROVE")} className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 cursor-pointer">
                        Approve
                      </button>
                      <button type="button" onClick={() => review(p.id, "REJECT")} className="px-4 py-2 rounded-lg border border-ivory-300 text-ink-700 text-sm hover:border-red-300 hover:text-red-700 cursor-pointer">
                        Reject
                      </button>
                    </>
                  )}
                  {p.status === "APPROVED" && (
                    <button type="button" onClick={() => review(p.id, "SUSPEND")} className="px-4 py-2 rounded-lg border border-ivory-300 text-ink-700 text-sm hover:border-red-300 hover:text-red-700 cursor-pointer">
                      Suspend
                    </button>
                  )}
                  {p.status === "SUSPENDED" && (
                    <button type="button" onClick={() => review(p.id, "REACTIVATE")} className="px-4 py-2 rounded-lg bg-ink-950 text-white text-sm font-medium hover:bg-ink-800 cursor-pointer">
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
