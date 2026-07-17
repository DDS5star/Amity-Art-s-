"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CaretLeft } from "@phosphor-icons/react";
import { adminJson } from "@/components/admin/auth";
import { ProductForm, EMPTY_PRODUCT, toPayload, type ProductFormValues } from "@/components/admin/ProductForm";
import { VariantsPanel, type AdminVariant } from "@/components/admin/VariantsPanel";
import { StockAdjuster } from "@/components/admin/StockAdjuster";

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  shortDescription: string | null;
  description: string | null;
  material: string | null;
  weightGrams: string | null;
  retailPrice: string;
  wholesalePrice: string | null;
  compareAtPrice: string | null;
  stockQty: number;
  lowStockAlert: number;
  moqWholesale: number;
  packSize: number;
  visibility: "RETAIL" | "WHOLESALE" | "BOTH";
  gender: "MEN" | "WOMEN" | "UNISEX" | "KIDS";
  occasion: string[];
  searchKeywords: string[];
  isActive: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  hasVariants: boolean;
  variants: AdminVariant[];
}

const toFormValues = (p: AdminProduct): ProductFormValues => ({
  name: p.name,
  sku: p.sku,
  categoryId: p.categoryId,
  shortDescription: p.shortDescription ?? "",
  description: p.description ?? "",
  material: p.material ?? "",
  weightGrams: p.weightGrams ? String(p.weightGrams) : "",
  retailPrice: String(p.retailPrice),
  wholesalePrice: p.wholesalePrice ? String(p.wholesalePrice) : "",
  compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : "",
  stockQty: String(p.stockQty),
  lowStockAlert: String(p.lowStockAlert),
  moqWholesale: String(p.moqWholesale),
  packSize: String(p.packSize),
  visibility: p.visibility,
  gender: p.gender,
  occasion: p.occasion.join(", "),
  searchKeywords: p.searchKeywords.join(", "),
  isActive: p.isActive,
  isFeatured: p.isFeatured,
  isTrending: p.isTrending,
  isNewArrival: p.isNewArrival,
  isBestSeller: p.isBestSeller,
});

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [values, setValues] = useState<ProductFormValues>(EMPTY_PRODUCT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const p = await adminJson<AdminProduct>(`/api/admin/products/${id}`);
    setProduct(p);
    setValues(toFormValues(p));
  }, [id]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const submit = async () => {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await adminJson(`/api/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(toPayload(values, false)),
      });
      setSaved(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  if (!product) {
    return <p className="text-sm text-ink-400">{error || "Loading…"}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-950">
            <CaretLeft size={14} /> Products
          </Link>
          <h1 className="mt-2 font-display text-3xl text-ink-950">{product.name}</h1>
          <p className="text-sm text-ink-400 mt-1">
            {product.sku} ·{" "}
            <a href={`/product/${product.slug}`} target="_blank" className="text-gold-700 hover:underline">
              View in store
            </a>
          </p>
        </div>
        {saved && <p className="text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg">Saved ✓</p>}
      </div>

      <div className="mt-6">
        <ProductForm
          values={values}
          onChange={(v) => {
            setValues(v);
            setSaved(false);
          }}
          onSubmit={submit}
          submitLabel="Save changes"
          busy={busy}
          error={error}
          isCreate={false}
        />
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VariantsPanel productId={product.id} variants={product.variants} onChanged={load} />
        </div>
        <StockAdjuster
          productId={product.id}
          productStock={product.stockQty}
          variants={product.variants}
          onChanged={load}
        />
      </div>
    </div>
  );
}
