"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from "motion/react";
import { Handbag, List, X } from "@phosphor-icons/react";
import { useCart, cartCount } from "@/components/cart/store";

const LINKS = [
  { href: "/jewellery", label: "Jewellery" },
  { href: "/jewellery?categorySlug=bridal-collection", label: "Bridal" },
  { href: "/jewellery?newArrival=true", label: "New" },
  { href: "/wholesale", label: "Wholesale" },
];

export function Navbar() {
  const [solid, setSolid] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const lines = useCart((s) => s.lines);
  const openCart = useCart((s) => s.open);
  const count = cartCount(lines);

  useMotionValueEvent(scrollY, "change", (y) => setSolid(y > 24));

  return (
    <motion.header
      initial={reduce ? false : { y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`sticky top-0 z-40 h-16 transition-colors duration-300 ${
        solid ? "bg-forest-950/90 backdrop-blur-md border-b border-forest-800" : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-6">
        <Link href="/" className="font-display text-2xl tracking-wide text-bone-50">
          Amity&nbsp;Art&apos;s
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm text-bone-300 hover:text-bone-50 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={openCart}
            aria-label={`Open cart, ${count} items`}
            className="relative p-2 text-bone-100 hover:text-amber-soft transition-colors active:scale-[0.96]"
          >
            <Handbag size={22} weight="light" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-accent text-forest-950 text-[11px] font-semibold flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
          <button
            type="button"
            className="md:hidden p-2 text-bone-100"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={22} /> : <List size={22} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="md:hidden bg-forest-950 border-b border-forest-800 px-4 py-4 flex flex-col gap-3">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="text-bone-300 hover:text-bone-50 py-1"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </motion.header>
  );
}
