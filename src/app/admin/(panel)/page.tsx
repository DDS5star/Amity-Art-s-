"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminJson } from "@/components/admin/auth";

interface Stats {
  products: { total: number; active: number };
  lowStock: { id: string; name: string; sku: string; stockQty: number; lowStockAlert: number }[];
  categories: number;
  customers: number;
  wholesalers: { pending: number; approved: number };
  orders: { total: number };
  recentAudit: {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    actor: { firstName: string; lastName: string | null; email: string } | null;
  }[];
}

function StatCard({ label, value, hint, href }: { label: string; value: string | number; hint?: string; href?: string }) {
  const inner = (
    <div className="bg-white rounded-xl border border-ivory-200 p-5 h-full hover:border-ivory-300 transition-colors">
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<Stats>("/api/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-white rounded-xl border border-ivory-200 p-5 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink-950">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Products"
          value={stats.products.total}
          hint={`${stats.products.active} active`}
          href="/admin/products"
        />
        <StatCard
          label="Pending wholesalers"
          value={stats.wholesalers.pending}
          hint={`${stats.wholesalers.approved} approved`}
          href="/admin/wholesalers"
        />
        <StatCard label="Customers" value={stats.customers} />
        <StatCard
          label="Orders"
          value={stats.orders.total}
          hint="Checkout launches next release"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-ivory-200">
          <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-950">Low stock</h2>
            <Link href="/admin/products?lowStock=true" className="text-xs text-gold-700 hover:underline">
              View all
            </Link>
          </div>
          {stats.lowStock.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-400">All products are above their alert level.</p>
          ) : (
            <ul className="divide-y divide-ivory-200">
              {stats.lowStock.map((p) => (
                <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <Link href={`/admin/products/${p.id}`} className="min-w-0">
                    <p className="text-sm text-ink-950 truncate hover:text-gold-700">{p.name}</p>
                    <p className="text-xs text-ink-400">{p.sku}</p>
                  </Link>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      p.stockQty === 0 ? "bg-red-50 text-red-700" : "bg-gold-100 text-gold-800"
                    }`}
                  >
                    {p.stockQty} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-ivory-200">
          <div className="px-5 py-4 border-b border-ivory-200">
            <h2 className="text-sm font-semibold text-ink-950">Recent activity</h2>
          </div>
          {stats.recentAudit.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-400">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-ivory-200">
              {stats.recentAudit.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <p className="text-sm text-ink-950">
                    <span className="font-medium">{a.actor ? a.actor.firstName : "System"}</span>{" "}
                    <span className="text-ink-500">{a.action.replace(".", " → ")}</span>
                  </p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {new Date(a.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
