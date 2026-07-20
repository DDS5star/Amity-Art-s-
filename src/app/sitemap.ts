import type { MetadataRoute } from "next";
import { prisma } from "@/server/db";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Generated per request (CDN-cacheable) so image builds never need a live
// database and new products appear without a redeploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null, isActive: true, visibility: { in: ["RETAIL", "BOTH"] } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { deletedAt: null, isActive: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  return [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/jewellery`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/wholesale`, changeFrequency: "monthly", priority: 0.5 },
    ...categories.map((c) => ({
      url: `${BASE}/jewellery?categorySlug=${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${BASE}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
