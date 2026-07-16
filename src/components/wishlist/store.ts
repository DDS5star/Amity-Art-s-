"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Local wishlist (persists to localStorage); server sync arrives with accounts UI. */
export interface WishlistItem {
  productId: string;
  slug: string;
  name: string;
  unitPrice: number;
  image: string | null;
}

interface WishlistState {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  has: (productId: string) => boolean;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) =>
        set((s) =>
          s.items.some((i) => i.productId === item.productId)
            ? { items: s.items.filter((i) => i.productId !== item.productId) }
            : { items: [...s.items, item] },
        ),
      has: (productId) => get().items.some((i) => i.productId === productId),
    }),
    { name: "amity-wishlist" },
  ),
);
