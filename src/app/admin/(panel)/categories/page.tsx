"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { adminJson } from "@/components/admin/auth";

interface Category {
  id: string;
  name: string;
  slug: string;
  path: string;
  depth: number;
  isActive: boolean;
  parentId: string | null;
  _count: { products: number };
}

const input =
  "px-3.5 py-2.5 rounded-lg border border-ivory-300 bg-white text-sm text-ink-950 focus:border-gold-600";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setCategories(await adminJson<Category[]>("/api/admin/categories"));
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminJson("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name, parentId: parentId || undefined }),
      });
      setName("");
      setParentId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (c: Category) => {
    try {
      await adminJson(`/api/admin/categories/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink-950">Categories</h1>

      <form onSubmit={create} className="mt-6 bg-white rounded-xl border border-ivory-200 p-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="cat-name" className="block text-xs text-ink-500 mb-1">Name</label>
          <input id="cat-name" required className={`${input} w-full`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anklets" />
        </div>
        <div className="min-w-[200px]">
          <label htmlFor="cat-parent" className="block text-xs text-ink-500 mb-1">Parent (optional)</label>
          <select id="cat-parent" className={`${input} w-full`} value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Top level</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(c.depth)}{c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink-950 text-white text-sm font-medium hover:bg-ink-800 disabled:opacity-60 cursor-pointer"
        >
          <Plus size={15} /> Add
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 bg-white rounded-xl border border-ivory-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-ivory-200">
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Slug</th>
              <th className="px-5 py-3 font-medium">Products</th>
              <th className="px-5 py-3 font-medium">Visible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {categories === null ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-400">Loading…</td></tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="hover:bg-ivory-50">
                  <td className="px-5 py-3 text-ink-950">
                    <span style={{ paddingLeft: `${c.depth * 18}px` }}>
                      {c.depth > 0 && <span className="text-ink-400 mr-1.5">↳</span>}
                      {c.name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-500">{c.slug}</td>
                  <td className="px-5 py-3 text-ink-700">{c._count.products}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={c.isActive}
                      onClick={() => toggleActive(c)}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        c.isActive ? "bg-ink-950" : "bg-ivory-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                          c.isActive ? "left-5" : "left-1"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
