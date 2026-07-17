"use client";

import { useEffect, useState } from "react";
import { adminJson } from "@/components/admin/auth";

interface Category {
  id: string;
  name: string;
  depth: number;
}

export interface ProductFormValues {
  name: string;
  sku: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  material: string;
  weightGrams: string;
  retailPrice: string;
  wholesalePrice: string;
  compareAtPrice: string;
  stockQty: string;
  lowStockAlert: string;
  moqWholesale: string;
  packSize: string;
  visibility: "RETAIL" | "WHOLESALE" | "BOTH";
  gender: "MEN" | "WOMEN" | "UNISEX" | "KIDS";
  occasion: string; // comma separated in the form
  searchKeywords: string;
  isActive: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
}

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "", sku: "", categoryId: "", shortDescription: "", description: "",
  material: "", weightGrams: "", retailPrice: "", wholesalePrice: "",
  compareAtPrice: "", stockQty: "0", lowStockAlert: "5", moqWholesale: "1",
  packSize: "1", visibility: "BOTH", gender: "WOMEN", occasion: "",
  searchKeywords: "", isActive: true, isFeatured: false, isTrending: false,
  isNewArrival: false, isBestSeller: false,
};

/** Form values → API payload (numbers parsed, CSV split, empties dropped). */
export function toPayload(v: ProductFormValues, isCreate: boolean) {
  const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  return {
    name: v.name,
    ...(isCreate ? { sku: v.sku } : {}),
    categoryId: v.categoryId,
    shortDescription: v.shortDescription || undefined,
    description: v.description || undefined,
    material: v.material || undefined,
    weightGrams: v.weightGrams ? Number(v.weightGrams) : undefined,
    retailPrice: Number(v.retailPrice),
    wholesalePrice: v.wholesalePrice ? Number(v.wholesalePrice) : null,
    compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
    ...(isCreate ? { stockQty: Number(v.stockQty) || 0 } : {}),
    lowStockAlert: Number(v.lowStockAlert) || 5,
    moqWholesale: Number(v.moqWholesale) || 1,
    packSize: Number(v.packSize) || 1,
    visibility: v.visibility,
    gender: v.gender,
    occasion: csv(v.occasion),
    searchKeywords: csv(v.searchKeywords),
    isActive: v.isActive,
    isFeatured: v.isFeatured,
    isTrending: v.isTrending,
    isNewArrival: v.isNewArrival,
    isBestSeller: v.isBestSeller,
  };
}

const input =
  "w-full px-3.5 py-2.5 rounded-lg border border-ivory-300 bg-white text-sm text-ink-950 focus:border-gold-600";
const label = "block text-sm text-ink-700 mb-1.5";

export function ProductForm({
  values,
  onChange,
  onSubmit,
  submitLabel,
  busy,
  error,
  isCreate,
}: {
  values: ProductFormValues;
  onChange: (v: ProductFormValues) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy: boolean;
  error: string;
  isCreate: boolean;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) =>
    onChange({ ...values, [k]: val });

  useEffect(() => {
    adminJson<Category[]>("/api/admin/categories").then(setCategories).catch(() => {});
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Left: core fields */}
      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white rounded-xl border border-ivory-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={label} htmlFor="p-name">Name</label>
              <input id="p-name" required className={input} value={values.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="p-sku">SKU {isCreate ? "" : "(fixed)"}</label>
              <input id="p-sku" required disabled={!isCreate} className={`${input} disabled:bg-ivory-100 disabled:text-ink-400`} value={values.sku} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="p-cat">Category</label>
              <select id="p-cat" required className={input} value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {"— ".repeat(c.depth)}{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={label} htmlFor="p-short">Short description</label>
              <input id="p-short" className={input} value={values.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={label} htmlFor="p-desc">Description</label>
              <textarea id="p-desc" rows={4} className={input} value={values.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="p-material">Material</label>
              <input id="p-material" placeholder="Brass, 22k gold plated" className={input} value={values.material} onChange={(e) => set("material", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="p-weight">Weight (grams)</label>
              <input id="p-weight" type="number" step="0.01" min="0" className={input} value={values.weightGrams} onChange={(e) => set("weightGrams", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="p-occasion">Occasions (comma separated)</label>
              <input id="p-occasion" placeholder="wedding, festive" className={input} value={values.occasion} onChange={(e) => set("occasion", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="p-keywords">Search keywords (comma separated)</label>
              <input id="p-keywords" placeholder="kundan, bangle" className={input} value={values.searchKeywords} onChange={(e) => set("searchKeywords", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-ivory-200 p-6">
          <h2 className="text-sm font-semibold text-ink-950 mb-4">Pricing &amp; wholesale</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className={label} htmlFor="p-retail">Retail price ₹</label>
              <input id="p-retail" required type="number" step="0.01" min="0" className={input} value={values.retailPrice} onChange={(e) => set("retailPrice", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="p-wholesale">Wholesale price ₹</label>
              <input id="p-wholesale" type="number" step="0.01" min="0" placeholder="blank = retail only" className={input} value={values.wholesalePrice} onChange={(e) => set("wholesalePrice", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="p-compare">Compare-at (MRP) ₹</label>
              <input id="p-compare" type="number" step="0.01" min="0" className={input} value={values.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="p-moq">Wholesale MOQ</label>
              <input id="p-moq" type="number" min="1" className={input} value={values.moqWholesale} onChange={(e) => set("moqWholesale", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="p-pack">Pack size</label>
              <input id="p-pack" type="number" min="1" className={input} value={values.packSize} onChange={(e) => set("packSize", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="p-vis">Channel</label>
              <select id="p-vis" className={input} value={values.visibility} onChange={(e) => set("visibility", e.target.value as ProductFormValues["visibility"])}>
                <option value="BOTH">Retail + wholesale</option>
                <option value="RETAIL">Retail only</option>
                <option value="WHOLESALE">Wholesale only</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* Right: status + inventory + flags */}
      <div className="space-y-6">
        <section className="bg-white rounded-xl border border-ivory-200 p-6 space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-ink-950 font-medium">Active (visible in store)</span>
            <input type="checkbox" checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} className="w-4 h-4 accent-ink-950" />
          </label>
          <div>
            <label className={label} htmlFor="p-gender">Gender</label>
            <select id="p-gender" className={input} value={values.gender} onChange={(e) => set("gender", e.target.value as ProductFormValues["gender"])}>
              <option value="WOMEN">Women</option>
              <option value="MEN">Men</option>
              <option value="UNISEX">Unisex</option>
              <option value="KIDS">Kids</option>
            </select>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-ivory-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink-950">Inventory</h2>
          {isCreate ? (
            <div>
              <label className={label} htmlFor="p-stock">Opening stock</label>
              <input id="p-stock" type="number" min="0" className={input} value={values.stockQty} onChange={(e) => set("stockQty", e.target.value)} />
            </div>
          ) : (
            <p className="text-xs text-ink-400">
              Stock changes happen from the product page ledger, so every movement is audited.
            </p>
          )}
          <div>
            <label className={label} htmlFor="p-alert">Low-stock alert at</label>
            <input id="p-alert" type="number" min="0" className={input} value={values.lowStockAlert} onChange={(e) => set("lowStockAlert", e.target.value)} />
          </div>
        </section>

        <section className="bg-white rounded-xl border border-ivory-200 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink-950">Merchandising flags</h2>
          {(
            [
              ["isFeatured", "Featured"],
              ["isTrending", "Trending"],
              ["isNewArrival", "New arrival"],
              ["isBestSeller", "Best seller"],
            ] as const
          ).map(([key, text]) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-ink-700">{text}</span>
              <input type="checkbox" checked={values[key]} onChange={(e) => set(key, e.target.checked)} className="w-4 h-4 accent-ink-950" />
            </label>
          ))}
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-lg bg-ink-950 text-white text-sm font-semibold hover:bg-ink-800 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
