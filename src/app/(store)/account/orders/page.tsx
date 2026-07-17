"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStoreAuth, restoreStoreSession, storeJson } from "@/components/account/auth";
import { formatINR } from "@/lib/money";

interface Row {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: string;
  placedAt: string;
  dueDate: string | null;
  _count: { items: number };
}

export default function MyOrdersPage() {
  const { status, user } = useStoreAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unknown") void restoreStoreSession();
    if (status === "authed") {
      storeJson<{ items: Row[] }>("/api/orders").then((d) => setRows(d.items)).catch((e) => setError(e.message));
    }
  }, [status]);

  if (status === "guest") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-ink-950">Your orders</h1>
        <Link href="/account/login?next=/account/orders" className="mt-4 inline-block text-gold-700 underline underline-offset-4">
          Sign in to view your orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl text-ink-950">Your orders</h1>
      {user && <p className="mt-1 text-sm text-ink-500">{user.email}</p>}

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {rows === null ? (
        <p className="mt-8 text-sm text-ink-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-10 text-center py-16 bg-white rounded-2xl border border-ivory-200">
          <p className="text-ink-700">No orders yet.</p>
          <Link href="/jewellery" className="mt-2 inline-block text-sm text-gold-700 underline underline-offset-4">
            Browse the collection
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="block bg-white rounded-2xl border border-ivory-200 p-5 hover:border-gold-600 transition-colors"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-ink-950">{o.orderNumber}</p>
                    <p className="text-xs text-ink-400 mt-0.5">
                      {new Date(o.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}{o._count.items} item{o._count.items > 1 ? "s" : ""}
                      {o.channel === "WHOLESALE" ? " · Wholesale" : ""}
                      {o.paymentMethod === "PAY_LATER" && o.dueDate
                        ? ` · Due ${new Date(o.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-3 py-1 rounded-full bg-gold-100 text-gold-800">
                      {o.status.replaceAll("_", " ")}
                    </span>
                    <span className="font-semibold text-ink-950">{formatINR(Number(o.totalAmount))}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
