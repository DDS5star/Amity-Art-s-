import { prisma } from "@/server/db";

/** Server component — pulls the active announcement from the CMS table. */
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

  return (
    <div className="bg-forest-800 text-bone-300 text-center text-xs tracking-wide py-2 px-4">
      {bar.linkUrl ? (
        <a href={bar.linkUrl} className="hover:text-amber-soft transition-colors">
          {bar.text}
        </a>
      ) : (
        bar.text
      )}
    </div>
  );
}
