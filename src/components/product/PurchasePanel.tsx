"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import { useCart } from "@/components/cart/store";
import { formatINR } from "@/lib/money";
import { DeliveryEstimator } from "./DeliveryEstimator";

interface VariantAttr {
  attribute: string;
  code: string;
  isSizeAxis: boolean;
  value: string;
  valueCode: string;
  swatchHex: string | null;
}

interface Variant {
  id: string;
  sku: string;
  title: string;
  stockQty: number;
  unitPrice: number;
  attributes: VariantAttr[];
}

interface Props {
  product: {
    id: string;
    name: string;
    slug: string;
    unitPrice: number;
    compareAtPrice: number | null;
    inStock: boolean;
    imageUrl: string | null;
    minOrderQty?: number;
    maxOrderQty?: number | null;
  };
  variants: Variant[];
}

export function PurchasePanel({ product, variants }: Props) {
  // Group attribute options across variants, size axis last.
  const axes = useMemo(() => {
    const map = new Map<
      string,
      { name: string; isSizeAxis: boolean; values: Map<string, VariantAttr> }
    >();
    for (const v of variants) {
      for (const a of v.attributes) {
        if (!map.has(a.code)) {
          map.set(a.code, { name: a.attribute, isSizeAxis: a.isSizeAxis, values: new Map() });
        }
        map.get(a.code)!.values.set(a.valueCode, a);
      }
    }
    return [...map.entries()]
      .map(([code, ax]) => ({ code, ...ax, values: [...ax.values.values()] }))
      .sort((a, b) => Number(a.isSizeAxis) - Number(b.isSizeAxis));
  }, [variants]);

  const firstAvailable = variants.find((v) => v.stockQty > 0) ?? variants[0];
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    Object.fromEntries(firstAvailable?.attributes.map((a) => [a.code, a.valueCode]) ?? []),
  );
  const [qty, setQty] = useState(1);

  const selected = useMemo(
    () =>
      variants.find((v) =>
        v.attributes.every((a) => selection[a.code] === a.valueCode),
      ) ?? null,
    [variants, selection],
  );

  const hasVariants = variants.length > 0;
  const price = selected?.unitPrice ?? product.unitPrice;
  const inStock = hasVariants ? (selected?.stockQty ?? 0) > 0 : product.inStock;
  const add = useCart((s) => s.add);

  const addToCart = () => {
    add(
      {
        productId: product.id,
        variantId: selected?.id ?? null,
        slug: product.slug,
        name: product.name,
        variantTitle: selected?.title ?? null,
        unitPrice: price,
        image: product.imageUrl,
      },
      qty,
    );
  };

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <p className="text-2xl text-bone-50 font-semibold">{formatINR(price)}</p>
        {product.compareAtPrice && product.compareAtPrice > price && (
          <p className="text-bone-600 line-through">{formatINR(product.compareAtPrice)}</p>
        )}
        <p className="text-xs text-bone-600">incl. of all taxes</p>
      </div>

      {axes.map((axis) => (
        <fieldset key={axis.code} className="mt-6">
          <legend className="text-sm text-bone-300 mb-2">
            {axis.name}
            {selection[axis.code] && (
              <span className="text-bone-600">
                {" "}
                · {axis.values.find((v) => v.valueCode === selection[axis.code])?.value}
              </span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {axis.values.map((v) => {
              const isActive = selection[axis.code] === v.valueCode;
              return (
                <button
                  key={v.valueCode}
                  type="button"
                  onClick={() => setSelection((s) => ({ ...s, [axis.code]: v.valueCode }))}
                  aria-pressed={isActive}
                  className={`min-w-11 px-3.5 py-2 rounded-full text-sm transition-all active:scale-[0.97] ${
                    isActive
                      ? "bg-bone-100 text-forest-950 font-semibold"
                      : "border border-forest-700 text-bone-300 hover:border-bone-500"
                  }`}
                >
                  {v.swatchHex && (
                    <span
                      aria-hidden
                      className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle border border-black/20"
                      style={{ backgroundColor: v.swatchHex }}
                    />
                  )}
                  {v.value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="mt-8 flex items-center gap-4">
        <div className="flex items-center border border-forest-700 rounded-full">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(product.minOrderQty ?? 1, q - 1))}
            className="p-3 text-bone-300 hover:text-bone-50"
          >
            <Minus size={14} />
          </button>
          <span className="w-8 text-center text-sm text-bone-100">{qty}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(product.maxOrderQty ?? 10, q + 1))}
            className="p-3 text-bone-300 hover:text-bone-50"
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          type="button"
          disabled={!inStock}
          onClick={addToCart}
          className="flex-1 py-3.5 rounded-full bg-amber-accent text-forest-950 text-sm font-semibold hover:bg-amber-soft transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {inStock ? "Add to cart" : "Out of stock"}
        </button>
      </div>

      {hasVariants && selected && (
        <p className="mt-3 text-xs text-bone-600">
          {selected.stockQty > 0 && selected.stockQty <= 10
            ? `Only ${selected.stockQty} left in this option`
            : `SKU ${selected.sku}`}
        </p>
      )}

      <div className="mt-8 border-t border-forest-800 pt-6">
        <DeliveryEstimator productId={product.id} variantId={selected?.id} />
      </div>
    </div>
  );
}
