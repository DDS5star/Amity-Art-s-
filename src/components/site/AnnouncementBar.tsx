import { prisma } from "@/server/db";

/** Marquee announcement (Mortantra-style) — content from the CMS table. */
export async function AnnouncementBar() {
  const now = new Date();
  const bar = await prisma.announcementBar.findFirst({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!bar) return null;

  const item = (
    <span className="mx-8 text-xs tracking-[0.08em] uppercase whitespace-nowrap">
      {bar.text}
    </span>
  );

  const strip = (
    <div className="flex shrink-0">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="flex items-center">
          {item}
          <span aria-hidden className="text-gold-500">
        ✦
          </span>
        </span>
      ))}
    </div>
  );

  const inner = (
    <div className="flex w-max animate-marquee" aria-label={bar.text}>
      {strip}
      <div aria-hidden className="flex shrink-0">
        {strip}
      </div>
    </div>
  );

  return (
    <div className="bg-ink-950 text-ivory-100 py-2 overflow-hidden">
      {bar.linkUrl ? (
        <a href={bar.linkUrl} className="block hover:text-gold-100 transition-colors">
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  );
}
