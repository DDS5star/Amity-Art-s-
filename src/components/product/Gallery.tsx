"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

interface Media {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  altText: string | null;
  type: string;
}

export function Gallery({ media, name }: { media: Media[]; name: string }) {
  const images = media.filter((m) => m.type === "IMAGE");
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const current = images[index];

  if (images.length === 0) {
    return (
      <div className="aspect-[4/5] rounded-xl bg-ivory-100 flex items-center justify-center text-ink-400">
        Photography coming soon
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-ivory-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <Image
              src={current.url}
              alt={current.altText ?? name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex gap-3">
          {images.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative w-20 aspect-[4/5] rounded-lg overflow-hidden transition-opacity ${
                i === index ? "ring-2 ring-gold-600" : "opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={m.thumbnailUrl ?? m.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
