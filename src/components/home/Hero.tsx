"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";

const HeroScene = dynamic(() => import("./HeroScene").then((m) => m.HeroScene), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-full bg-forest-850 animate-pulse" aria-hidden />
  ),
});

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 28 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        };

  return (
    <section className="relative min-h-[calc(100dvh-6rem)] max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 items-center gap-10 pt-16 lg:pt-0">
      <div className="lg:col-span-6 xl:col-span-5">
        <motion.h1
          {...enter(0)}
          className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-bone-50"
        >
          Fine jewellery,
          <br />
          <em className="italic text-amber-soft leading-[1.1]">honestly</em> made.
        </motion.h1>
        <motion.p
          {...enter(0.12)}
          className="mt-6 text-bone-300 leading-relaxed max-w-[42ch]"
        >
          Kundan, polki and pearl pieces handcrafted in Mumbai. Nickel-free
          plating, GST invoices, delivered across India.
        </motion.p>
        <motion.div {...enter(0.24)} className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="/jewellery"
            className="px-7 py-3.5 rounded-full bg-amber-accent text-forest-950 text-sm font-semibold hover:bg-amber-soft transition-colors active:scale-[0.98]"
          >
            Explore the collection
          </Link>
          <Link
            href="/wholesale"
            className="px-7 py-3.5 rounded-full border border-forest-600 text-bone-100 text-sm hover:border-bone-500 transition-colors active:scale-[0.98]"
          >
            Wholesale enquiries
          </Link>
        </motion.div>
      </div>

      <div className="lg:col-span-6 xl:col-span-7 h-[340px] md:h-[440px] lg:h-[560px]">
        <HeroScene />
      </div>
    </section>
  );
}
