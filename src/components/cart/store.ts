"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Local retail cart (persists to localStorage). Server-side cart sync and
 * checkout arrive in the checkout phase; the shape mirrors CartItem.
 */
export interface CartLine {
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantTitle: string | null;
  unitPrice: number;
  image: string | null;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  isOpen: boolean;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  remove: (productId: string, variantId: string | null) => void;
  setQty: (productId: string, variantId: string | null, qty: number) => void;
  open: () => void;
  close: () => void;
}

const sameLine = (a: CartLine, productId: string, variantId: string | null) =>
  a.productId === productId && a.variantId === variantId;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      add: (line, qty = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => sameLine(l, line.productId, line.variantId));
          const lines = existing
            ? s.lines.map((l) =>
                sameLine(l, line.productId, line.variantId) ? { ...l, qty: l.qty + qty } : l,
              )
            : [...s.lines, { ...line, qty }];
          return { lines, isOpen: true };
        }),
      remove: (productId, variantId) =>
        set((s) => ({ lines: s.lines.filter((l) => !sameLine(l, productId, variantId)) })),
      setQty: (productId, variantId, qty) =>
        set((s) => ({
          lines:
            qty <= 0
              ? s.lines.filter((l) => !sameLine(l, productId, variantId))
              : s.lines.map((l) => (sameLine(l, productId, variantId) ? { ...l, qty } : l)),
        })),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    { name: "amity-cart", partialize: (s) => ({ lines: s.lines }) },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = (lines: CartLine[]) =>
  Math.round(lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0) * 100) / 100;
