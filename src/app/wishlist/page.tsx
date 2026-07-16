import type { Metadata } from "next";
import { WishlistGrid } from "@/components/wishlist/WishlistGrid";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Pieces you have saved for later.",
};

export default function WishlistPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
      <h1 className="font-display text-4xl md:text-5xl text-ink-950">Wishlist</h1>
      <WishlistGrid />
    </div>
  );
}
