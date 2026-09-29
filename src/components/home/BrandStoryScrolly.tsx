"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";

/**
 * Scrollytelling brand story: lines reveal tied to scroll position, a
 * decorative ring slowly rotates with progress. Decorative motion only;
 * fully static under prefers-reduced-motion.
 */

const LINES = [
  "Every piece passes through fourteen pairs of hands.",
  "From the first wax mould to the final polish, our karigars shape each design the way their fathers taught them.",
  "Nickel-free brass. Stones set by hand. A one-year plating warranty on everything we make.",
];

function Line({ progress, index, total, text, headline }: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  text: string;
  headline?: boolean;
}) {
  const start = index / (total + 1);
  const end = (index + 1) / (total + 1);
  const opacity = useTransform(progress, [start, end], [0.12, 1]);
  const y = useTransform(progress, [start, end], [24, 0]);
  return (
    <motion.p
      style={{ opacity, y }}
      className={
        headline
          ? "font-display text-4xl md:text-5xl leading-[1.15] text-ivory-50"
          : "text-ivory-200 leading-relaxed text-lg max-w-[52ch] mx-auto"
      }
    >
      {text}
    </motion.p>
  );
}

export function BrandStoryScrolly() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "end 45%"],
  });
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const ringScale = useTransform(scrollYProgress, [0, 1], [0.85, 1.05]);

  if (reduce) {
    return (
      <div className="relative text-center space-y-8">
        <p className="font-display text-4xl md:text-5xl leading-[1.15] text-ivory-50">{LINES[0]}</p>
        <p className="text-ivory-200 leading-relaxed text-lg max-w-[52ch] mx-auto">{LINES[1]}</p>
        <p className="text-ivory-200 leading-relaxed text-lg max-w-[52ch] mx-auto">{LINES[2]}</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative text-center">
      {/* Decorative rotating ring behind the copy */}
      <motion.svg
        aria-hidden
        viewBox="0 0 400 400"
        style={{ rotate, scale: ringScale, willChange: "transform" }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] md:w-[560px] md:h-[560px] opacity-[0.14]"
      >
        <circle cx="200" cy="200" r="180" fill="none" stroke="#c07f0e" strokeWidth="1.5" strokeDasharray="4 14" />
        <circle cx="200" cy="200" r="140" fill="none" stroke="#c07f0e" strokeWidth="0.8" strokeDasharray="2 10" />
      </motion.svg>

      <div className="relative space-y-8">
        <Line progress={scrollYProgress} index={0} total={LINES.length} text={LINES[0]} headline />
        <Line progress={scrollYProgress} index={1} total={LINES.length} text={LINES[1]} />
        <Line progress={scrollYProgress} index={2} total={LINES.length} text={LINES[2]} />
      </div>
    </div>
  );
}
