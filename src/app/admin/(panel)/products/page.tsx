"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Plus, MagnifyingGlass } from "@phosphor-icons/react";
import { adminJson } from "@/components/admin/auth";
import { formatINR } from "@/lib/money";

interface Row {
  id: string;
  name: string;
  sku: string;
  isActive: boolean;
  retailPrice: string;
  wholesalePrice: string | null;
  stockQty: number;
  lowStockAlert: number;
  hasVariants: boolean;
  visibility: string;
  category: { name: string };
  media: { thumbnailUrl: string | null; url: string }[];
  _count: { variants: number };
}

function ProductsTable() {
  const params = useSearchParams();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [error, setError] = useState("");
  const lowStock = params.get("lowStock") === "true";

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams({ page: String(page), limit: "25", status });
      if (search) q.set("search", search);
      if (lowStock) q.set("lowStock", "true");
      const data = await adminJson<{ items: Row[]; pagination: { total: number } }>(
        `/api/admin/products?${q}`,
      );
      setRows(data.items);
      setTotal(data.pagination.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [page, search, status, lowStock]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0); // debounce typing
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-display text-3xl text-ink-950">
          Products{lowStock ? " · low stock" : ""}
        </h1>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink-950 text-white text-sm font-medium hover:bg-ink-800 transition-colors"
        >
          <Plus size={16} /> New product
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or SKU"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-ivory-300 bg-white text-sm text-ink-950 focus:border-gold-600"
          />
        </div>
        {(["all", "active", "inactive"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm capitalize cursor-pointer transition-colors ${
              status === s ? "bg-ink-950 text-white" : "bg-white border border-ivory-300 text-ink-700"
            }`}
          >
            {s}
          </button>
        ))}
        <p className="ml-auto text-sm text-ink-400">{total} products</p>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <div className="mt-6 bg-white rounded-xl border border-ivory-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-ivory-200">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Retail</th>
              <th className="px-5 py-3 font-medium">Wholesale</th>
              <th className="px-5 py-3 font-medium">Stock</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {rows === null ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-ink-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-ink-400">
                  No products match.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="hover:bg-ivory-50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 group">
                      {p.media[0] ? (
                        <Image
                          src={p.media[0].thumbnailUrl ?? p.media[0].url}
                          alt=""
                          width={40}
                          height={50}
                          className="w-10 h-[50px] rounded-md object-cover bg-ivory-100"
                        />
                      ) : (
                        <div className="w-10 h-[50px] rounded-md bg-ivory-100" />
                      )}
                      <div className="min-w-0">
                        <p className="text-ink-950 group-hover:text-gold-700 truncate max-w-[260px]">
                          {p.name}
                        </p>
                        <p className="text-xs text-ink-400">
                          {p.sku}
                          {p.hasVariants && ` · ${p._count.variants} variants`}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-700">{p.category.name}</td>
                  <td className="px-5 py-3 text-ink-700">{formatINR(Number(p.retailPrice))}</td>
                  <td className="px-5 py-3 text-ink-700">
                    {p.wholesalePrice ? formatINR(Number(p.wholesalePrice)) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        p.stockQty === 0
                          ? "text-red-700 font-medium"
                          : p.stockQty <= p.lowStockAlert
                            ? "text-gold-800 font-medium"
                            : "text-ink-700"
                      }
                    >
                      {p.stockQty}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full ${
                        p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-ivory-100 text-ink-500"
                      }`}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 25 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-ivory-300 bg-white disabled:opacity-40 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-ink-500">
            Page {page} of {Math.ceil(total / 25)}
          </span>
          <button
            type="button"
            disabled={page >= Math.ceil(total / 25)}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-ivory-300 bg-white disabled:opacity-40 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense>
      <ProductsTable />
    </Suspense>
  );
}
