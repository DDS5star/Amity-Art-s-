"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from "motion/react";
import { Handbag, Heart, List, X } from "@phosphor-icons/react";
import { useCart, cartCount } from "@/components/cart/store";
import { useWishlist } from "@/components/wishlist/store";

const LINKS = [
  { href: "/jewellery", label: "Jewellery" },
  { href: "/jewellery?categorySlug=bridal-collection", label: "Bridal" },
  { href: "/jewellery?newArrival=true", label: "New" },
  { href: "/wholesale", label: "Wholesale" },
];

export function Navbar({ logo }: { logo: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const lines = useCart((s) => s.lines);
  const openCart = useCart((s) => s.open);
  const wishlistCount = useWishlist((s) => s.items.length);
  const count = cartCount(lines);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <motion.header
      initial={reduce ? false : { y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`sticky top-0 z-40 h-16 md:h-20 bg-ivory-50/95 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? "shadow-[0_1px_0_0_var(--color-ivory-200),0_8px_24px_-16px_rgb(25_22_18/0.25)]" : ""
      }`}
    >
      <nav className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-6">
        <Link href="/" aria-label="Amity Arts home" className="shrink-0">
          {logo}
        </Link>

        <div className="hidden md:flex items-center gap-9">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-[13px] uppercase tracking-[0.14em] text-ink-700 hover:text-gold-700 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/wishlist"
            aria-label={`Wishlist, ${wishlistCount} items`}
            className="relative p-2.5 text-ink-800 hover:text-gold-700 transition-colors active:scale-[0.96]"
          >
            <Heart size={21} weight="light" />
            {wishlistCount > 0 && (
              <span className="absolute top-0.5 right-0 min-w-[17px] h-[17px] px-1 rounded-full bg-gold-700 text-white text-[10px] font-semibold flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={openCart}
            aria-label={`Open cart, ${count} items`}
            className="relative p-2.5 text-ink-800 hover:text-gold-700 transition-colors active:scale-[0.96]"
          >
            <Handbag size={21} weight="light" />
            {count > 0 && (
              <span className="absolute top-0.5 right-0 min-w-[17px] h-[17px] px-1 rounded-full bg-gold-700 text-white text-[10px] font-semibold flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
          <button
            type="button"
            className="md:hidden p-2.5 text-ink-800"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={21} /> : <List size={21} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="md:hidden bg-ivory-50 border-b border-ivory-200 px-4 py-4 flex flex-col gap-3">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="text-ink-700 hover:text-gold-700 py-1 text-sm uppercase tracking-[0.12em]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </motion.header>
  );
}
