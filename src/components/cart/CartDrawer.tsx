"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, Minus, Plus, Handbag } from "@phosphor-icons/react";
import { useCart, cartSubtotal } from "./store";
import { formatINR } from "@/lib/money";

export function CartDrawer() {
  const { lines, isOpen, close, remove, setQty } = useCart();
  const reduce = useReducedMotion();
  const subtotal = cartSubtotal(lines);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            aria-label="Close cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-black/60 cursor-default"
          />
          <motion.aside
            role="dialog"
            aria-label="Shopping cart"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="fixed right-0 top-0 z-50 h-[100dvh] w-full max-w-md bg-forest-900 border-l border-forest-800 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 h-16 border-b border-forest-800">
              <p className="font-display text-xl text-bone-50">Your cart</p>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="p-2 text-bone-300 hover:text-bone-50 active:scale-[0.96]"
              >
                <X size={20} />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
                <Handbag size={40} weight="thin" className="text-bone-600" />
                <p className="text-bone-300">Your cart is empty.</p>
                <Link
                  href="/jewellery"
                  onClick={close}
                  className="text-sm text-amber-soft hover:text-amber-accent underline underline-offset-4"
                >
                  Browse the collection
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 overflow-y-auto divide-y divide-forest-800">
                  {lines.map((l) => (
                    <li key={`${l.productId}:${l.variantId}`} className="flex gap-4 p-5">
                      {l.image && (
                        <Image
                          src={l.image}
                          alt={l.name}
                          width={72}
                          height={90}
                          className="w-[72px] h-[90px] rounded-md object-cover bg-forest-800"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/product/${l.slug}`}
                          onClick={close}
                          className="text-sm text-bone-100 hover:text-amber-soft line-clamp-1"
                        >
                          {l.name}
                        </Link>
                        {l.variantTitle && (
                          <p className="text-xs text-bone-500 mt-0.5">{l.variantTitle}</p>
                        )}
                        <p className="text-sm text-bone-300 mt-1">{formatINR(l.unitPrice)}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center border border-forest-700 rounded-full">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => setQty(l.productId, l.variantId, l.qty - 1)}
                              className="p-1.5 text-bone-300 hover:text-bone-50"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-7 text-center text-xs text-bone-100">{l.qty}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => setQty(l.productId, l.variantId, l.qty + 1)}
                              className="p-1.5 text-bone-300 hover:text-bone-50"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(l.productId, l.variantId)}
                            className="text-xs text-bone-600 hover:text-bone-300 underline underline-offset-2"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-forest-800 p-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-bone-300">Subtotal</span>
                    <span className="text-bone-50 font-semibold">{formatINR(subtotal)}</span>
                  </div>
                  <p className="text-xs text-bone-600">
                    GST and shipping calculated at checkout.
                  </p>
                  <button
                    type="button"
                    disabled
                    title="Checkout ships in the next release"
                    className="w-full py-3 rounded-full bg-amber-accent text-forest-950 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Checkout coming soon
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
