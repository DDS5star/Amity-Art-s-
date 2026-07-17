"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CaretLeft } from "@phosphor-icons/react";
import { adminJson } from "@/components/admin/auth";
import { ProductForm, EMPTY_PRODUCT, toPayload, type ProductFormValues } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(EMPTY_PRODUCT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const product = await adminJson<{ id: string }>("/api/admin/products", {
        method: "POST",
        body: JSON.stringify(toPayload(values, true)),
      });
      router.replace(`/admin/products/${product.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create product");
      setBusy(false);
    }
  };

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-950">
        <CaretLeft size={14} /> Products
      </Link>
      <h1 className="mt-2 font-display text-3xl text-ink-950">New product</h1>
      <div className="mt-6">
        <ProductForm
          values={values}
          onChange={setValues}
          onSubmit={submit}
          submitLabel="Create product"
          busy={busy}
          error={error}
          isCreate
        />
      </div>
    </div>
  );
}
