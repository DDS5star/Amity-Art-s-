"use client";

import { useState } from "react";
import { Truck } from "@phosphor-icons/react";

interface Estimate {
  zoneName: string;
  minDays: number;
  maxDays: number;
  earliest: string;
  latest: string;
  outOfStock: boolean;
  shippingRate: number;
  freeAbove: number | null;
  codAvailable: boolean;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** Live ETA from /api/shipping/estimate — same engine both channels use. */
export function DeliveryEstimator({ productId, variantId }: { productId: string; variantId?: string }) {
  const [pincode, setPincode] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      setState("error");
      setError("Enter a valid 6-digit pincode.");
      return;
    }
    setState("loading");
    setEstimate(null);
    try {
      const params = new URLSearchParams({ pincode, productId });
      if (variantId) params.set("variantId", variantId);
      const res = await fetch(`/api/shipping/estimate?${params}`);
      const body = await res.json();
      if (!body.success) throw new Error(body.error?.message ?? "Could not estimate");
      setEstimate(body.data);
      setState("idle");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not estimate delivery.");
    }
  };

  return (
    <div>
      <form onSubmit={check} noValidate className="flex gap-3">
        <label htmlFor="pincode" className="sr-only">
          Delivery pincode
        </label>
        <input
          id="pincode"
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, ""));
            setState("idle");
          }}
          placeholder="Delivery pincode"
          className="flex-1 px-4 py-2.5 rounded-full bg-forest-900 border border-forest-700 text-bone-100 placeholder:text-bone-600 text-sm focus:border-amber-accent"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="px-5 py-2.5 rounded-full border border-forest-600 text-bone-100 text-sm hover:border-bone-500 transition-colors disabled:opacity-60"
        >
          {state === "loading" ? "Checking…" : "Check"}
        </button>
      </form>

      {state === "error" && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {estimate && (
        <div className="mt-3 flex items-start gap-3 text-sm">
          <Truck size={18} className="text-amber-soft mt-0.5 shrink-0" />
          <div className="text-bone-300">
            <p>
              Delivery by{" "}
              <span className="text-bone-50 font-medium">
                {fmtDate(estimate.earliest)} to {fmtDate(estimate.latest)}
              </span>{" "}
              ({estimate.zoneName})
            </p>
            <p className="text-xs text-bone-600 mt-1">
              {estimate.outOfStock && "Made to order. "}
              Shipping ₹{estimate.shippingRate}
              {estimate.freeAbove ? `, free above ₹${estimate.freeAbove}` : ""}
              {estimate.codAvailable ? " · Cash on delivery available" : " · Prepaid only"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
