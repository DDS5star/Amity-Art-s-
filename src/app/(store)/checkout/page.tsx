"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart, cartSubtotal } from "@/components/cart/store";
import { useStoreAuth, restoreStoreSession, storeJson } from "@/components/account/auth";
import { AddressFields, EMPTY_ADDRESS, toAddressPayload, type AddressValues } from "@/components/account/AddressFields";
import { formatINR } from "@/lib/money";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, remove } = useCart();
  const clearLine = remove;
  const { status } = useStoreAuth();
  const [address, setAddress] = useState<AddressValues>(EMPTY_ADDRESS);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const subtotal = cartSubtotal(lines);

  useEffect(() => {
    if (status === "unknown") void restoreStoreSession();
  }, [status]);

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const order = await storeJson<{ id: string; orderNumber: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          lines: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId ?? undefined,
            quantity: l.qty,
          })),
          shippingAddress: toAddressPayload(address),
          paymentMethod: "COD",
          customerNote: note || undefined,
        }),
      });
      // Empty the cart, then hand over to the confirmation page.
      lines.forEach((l) => clearLine(l.productId, l.variantId));
      router.replace(`/orders/${order.id}?placed=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place the order");
      setBusy(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-ink-950">Your cart is empty</h1>
        <Link href="/jewellery" className="mt-4 inline-block text-gold-700 underline underline-offset-4">
          Browse the collection
        </Link>
      </div>
    );
  }

  if (status === "guest") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-ink-950">Sign in to checkout</h1>
        <p className="mt-3 text-ink-500 text-sm">Your cart is saved — sign in or register to continue.</p>
        <Link
          href="/account/login?next=/checkout"
          className="mt-6 inline-block px-7 py-3.5 rounded-full bg-gold-700 text-white text-sm font-semibold hover:bg-gold-800"
        >
          Sign in / Register
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <h1 className="font-display text-4xl text-ink-950">Checkout</h1>

      <form onSubmit={placeOrder} className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <section className="bg-white rounded-2xl border border-ivory-200 p-6">
            <h2 className="text-sm font-semibold text-ink-950 mb-4">Delivery address</h2>
            <AddressFields values={address} onChange={setAddress} />
          </section>

          <section className="bg-white rounded-2xl border border-ivory-200 p-6">
            <h2 className="text-sm font-semibold text-ink-950 mb-4">Payment</h2>
            <label className="flex items-center gap-3 p-4 rounded-lg border border-gold-600 bg-gold-100/40 cursor-pointer">
              <input type="radio" checked readOnly className="accent-gold-700" />
              <div>
                <p className="text-sm font-medium text-ink-950">Cash on delivery</p>
                <p className="text-xs text-ink-500">Pay when your order arrives. Online payment is coming soon.</p>
              </div>
            </label>
            <div className="mt-4">
              <label className="block text-sm text-ink-700 mb-1.5" htmlFor="order-note">
                Order note (optional)
              </label>
              <input
                id="order-note"
                maxLength={500}
                className="w-full px-4 py-2.5 rounded-lg border border-ivory-300 bg-white text-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </section>
        </div>

        <aside className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-ivory-200 p-6 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold text-ink-950">Order summary</h2>
            <ul className="mt-4 divide-y divide-ivory-200">
              {lines.map((l) => (
                <li key={`${l.productId}:${l.variantId}`} className="py-3 flex gap-3">
                  {l.image && (
                    <Image src={l.image} alt="" width={48} height={60} className="w-12 h-[60px] rounded-md object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-950 line-clamp-1">{l.name}</p>
                    <p className="text-xs text-ink-400">
                      {l.variantTitle ? `${l.variantTitle} · ` : ""}Qty {l.qty}
                    </p>
                  </div>
                  <p className="text-sm text-ink-700">{formatINR(l.unitPrice * l.qty)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-ivory-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-500">Items ({lines.reduce((n, l) => n + l.qty, 0)})</span>
                <span className="text-ink-950">{formatINR(subtotal)}</span>
              </div>
              <p className="text-xs text-ink-400">
                Prices include GST. Shipping is calculated from your pincode and
                confirmed on the next screen.
              </p>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="cta-shimmer mt-5 w-full py-3.5 rounded-full bg-gold-700 text-white text-sm font-semibold hover:bg-gold-800 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {busy ? "Placing order…" : "Place order (COD)"}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
