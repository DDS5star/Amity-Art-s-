"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";

const HeroScene = dynamic(() => import("./HeroScene").then((m) => m.HeroScene), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-full bg-ivory-100 animate-pulse" aria-hidden />
  ),
});

const EASE = [0.16, 1, 0.3, 1] as const;

/** Headline words rise in sequence (kinetic-type entrance, reduced-motion safe). */
function RisingLine({ words, delay = 0 }: { words: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{words}</>;
  return (
    <span className="inline-block overflow-hidden pb-1 align-bottom">
      <motion.span
        className="inline-block"
        initial={{ y: "105%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, delay, ease: EASE }}
      >
        {words}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        };

  return (
    <section className="relative min-h-[calc(100dvh-7.5rem)] max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 items-center gap-10 pt-16 lg:pt-0">
      <div className="lg:col-span-6 xl:col-span-5">
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-ink-950">
          <RisingLine words="Fine jewellery," />
          <br />
          <span className="italic text-gold-600 leading-[1.1]">
            <RisingLine words="honestly" delay={0.12} />
          </span>{" "}
          <RisingLine words="made." delay={0.18} />
        </h1>
        <motion.p {...enter(0.3)} className="mt-6 text-ink-700 leading-relaxed max-w-[42ch]">
          Kundan, polki and pearl pieces handcrafted in India. Nickel-free
          plating, GST invoices, delivered nationwide.
        </motion.p>
        <motion.div {...enter(0.42)} className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="/jewellery"
            className="cta-shimmer px-7 py-3.5 rounded-full bg-gold-700 text-white text-sm font-semibold hover:bg-gold-800 transition-colors active:scale-[0.98]"
          >
            Explore the collection
          </Link>
          <Link
            href="/wholesale"
            className="px-7 py-3.5 rounded-full border border-ink-400 text-ink-800 text-sm hover:border-ink-800 transition-colors active:scale-[0.98]"
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
