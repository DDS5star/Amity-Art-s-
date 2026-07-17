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
            className="fixed right-0 top-0 z-50 h-[100dvh] w-full max-w-md bg-white border-l border-ivory-200 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 h-16 border-b border-ivory-200">
              <p className="font-display text-xl text-ink-950">Your cart</p>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="p-2 text-ink-700 hover:text-ink-950 active:scale-[0.96]"
              >
                <X size={20} />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
                <Handbag size={40} weight="thin" className="text-ink-400" />
                <p className="text-ink-700">Your cart is empty.</p>
                <Link
                  href="/jewellery"
                  onClick={close}
                  className="text-sm text-gold-700 hover:text-gold-800 underline underline-offset-4"
                >
                  Browse the collection
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 overflow-y-auto divide-y divide-ivory-200">
                  {lines.map((l) => (
                    <li key={`${l.productId}:${l.variantId}`} className="flex gap-4 p-5">
                      {l.image && (
                        <Image
                          src={l.image}
                          alt={l.name}
                          width={72}
                          height={90}
                          className="w-[72px] h-[90px] rounded-md object-cover bg-ivory-100"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/product/${l.slug}`}
                          onClick={close}
                          className="text-sm text-ink-950 hover:text-gold-700 line-clamp-1"
                        >
                          {l.name}
                        </Link>
                        {l.variantTitle && (
                          <p className="text-xs text-ink-500 mt-0.5">{l.variantTitle}</p>
                        )}
                        <p className="text-sm text-ink-700 mt-1">{formatINR(l.unitPrice)}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center border border-ivory-300 rounded-full">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => setQty(l.productId, l.variantId, l.qty - 1)}
                              className="p-1.5 text-ink-700 hover:text-ink-950"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-7 text-center text-xs text-ink-950">{l.qty}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => setQty(l.productId, l.variantId, l.qty + 1)}
                              className="p-1.5 text-ink-700 hover:text-ink-950"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(l.productId, l.variantId)}
                            className="text-xs text-ink-400 hover:text-ink-700 underline underline-offset-2"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-ivory-200 p-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-700">Subtotal</span>
                    <span className="text-ink-950 font-semibold">{formatINR(subtotal)}</span>
                  </div>
                  <p className="text-xs text-ink-400">
                    GST and shipping calculated at checkout.
                  </p>
                  <Link
                    href="/checkout"
                    onClick={close}
                    className="cta-shimmer block w-full py-3 rounded-full bg-gold-700 text-white text-sm font-semibold text-center hover:bg-gold-800 transition-colors active:scale-[0.99]"
                  >
                    Checkout
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
