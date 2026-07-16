import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { prisma } from "@/server/db";
import { badRequest, conflict, notFound } from "@/lib/api";
import { resolveUnitPrice, type Channel, type Tier } from "@/lib/pricing";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateProductInput,
  UpdateProductInput,
  CreateVariantInput,
  ListProductsQuery,
} from "@/lib/validation/catalog";

// ─────────────────────────── Categories ───────────────────────────

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function getCategoryTree() {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: [{ depth: "asc" }, { sortOrder: "asc" }],
  });
  type Node = (typeof categories)[number] & { children: Node[] };
  const map = new Map<string, Node>(categories.map((c) => [c.id, { ...c, children: [] }]));
  const roots: Node[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) map.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function createCategory(input: CreateCategoryInput) {
  const slug = input.slug ?? slugify(input.name);
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) throw conflict(`Category slug "${slug}" already exists`);

  let path = `/${slug}/`;
  let depth = 0;
  if (input.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent) throw notFound("Parent category");
    path = `${parent.path}${slug}/`;
    depth = parent.depth + 1;
  }

  return prisma.category.create({
    data: { ...input, slug, path, depth },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category || category.deletedAt) throw notFound("Category");

  // Slug / parent moves rewrite the subtree's materialized paths in one txn.
  const newSlug = input.slug ?? (input.name ? slugify(input.name) : category.slug);
  const parentChanged = input.parentId !== undefined && input.parentId !== category.parentId;
  const slugChanged = newSlug !== category.slug;

  if (!parentChanged && !slugChanged) {
    return prisma.category.update({ where: { id }, data: input });
  }

  return prisma.$transaction(async (tx) => {
    let newPath = `/${newSlug}/`;
    let newDepth = 0;
    const parentId = parentChanged ? input.parentId ?? null : category.parentId;
    if (parentId) {
      const parent = await tx.category.findUnique({ where: { id: parentId } });
      if (!parent) throw notFound("Parent category");
      if (parent.path.startsWith(category.path)) {
        throw badRequest("Cannot move a category under its own descendant");
      }
      newPath = `${parent.path}${newSlug}/`;
      newDepth = parent.depth + 1;
    }

    const updated = await tx.category.update({
      where: { id },
      data: { ...input, slug: newSlug, parentId, path: newPath, depth: newDepth },
    });

    // Rewrite descendants' paths + depths.
    const depthShift = newDepth - category.depth;
    await tx.$executeRaw`
      UPDATE "Category"
      SET "path" = ${newPath} || substring("path" from ${category.path.length + 1}),
          "depth" = "depth" + ${depthShift}
      WHERE "path" LIKE ${category.path + "%"} AND "id" <> ${id}`;

    return updated;
  });
}

// ─────────────────────────── Products ───────────────────────────

export const hashCombination = (attributeValueIds: string[]) =>
  createHash("sha256").update([...attributeValueIds].sort().join("|")).digest("hex");

export async function createProduct(input: CreateProductInput) {
  const slug = input.slug ?? slugify(input.name);
  const dupe = await prisma.product.findFirst({
    where: { OR: [{ slug }, { sku: input.sku }] },
  });
  if (dupe) throw conflict("A product with this slug or SKU already exists");

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category || category.deletedAt) throw notFound("Category");

  const { media, collectionIds, ...productData } = input;

  return prisma.product.create({
    data: {
      ...productData,
      slug,
      media: media?.length ? { create: media } : undefined,
      collections: collectionIds?.length
        ? { create: collectionIds.map((collectionId, i) => ({ collectionId, sortOrder: i })) }
        : undefined,
    },
    include: { media: true, category: true },
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.deletedAt) throw notFound("Product");
  // Media/collection updates get dedicated endpoints later; strip them here.
  const { media, collectionIds, ...data } = input;
  void media;
  void collectionIds;
  return prisma.product.update({ where: { id }, data, include: { media: true } });
}

export async function softDeleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.deletedAt) throw notFound("Product");
  return prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

/**
 * Create a variant from attribute value ids: computes combinationHash
 * (uniqueness guard), denormalized title, and matrixKey (non-size values).
 */
export async function createVariant(productId: string, input: CreateVariantInput) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.deletedAt) throw notFound("Product");

  const values = await prisma.attributeValue.findMany({
    where: { id: { in: input.attributeValueIds } },
    include: { attribute: true },
  });
  if (values.length !== input.attributeValueIds.length) {
    throw badRequest("One or more attribute values do not exist");
  }
  const attrIds = new Set(values.map((v) => v.attributeId));
  if (attrIds.size !== values.length) {
    throw badRequest("At most one value per attribute is allowed");
  }

  const sorted = [...values].sort((a, b) => a.attribute.sortOrder - b.attribute.sortOrder);
  const title = sorted.map((v) => v.value).join(" / ");
  const matrixKey =
    sorted.filter((v) => !v.attribute.isSizeAxis).map((v) => v.code).sort().join("|") || null;
  const combinationHash = hashCombination(input.attributeValueIds);

  const existing = await prisma.productVariant.findUnique({
    where: { productId_combinationHash: { productId, combinationHash } },
  });
  if (existing) throw conflict("A variant with this attribute combination already exists");

  const { attributeValueIds, ...variantData } = input;

  const variant = await prisma.$transaction(async (tx) => {
    const v = await tx.productVariant.create({
      data: { ...variantData, productId, title, matrixKey, combinationHash },
    });
    await tx.variantAttributeValue.createMany({
      data: attributeValueIds.map((attributeValueId) => ({ variantId: v.id, attributeValueId })),
    });
    if (!product.hasVariants) {
      await tx.product.update({ where: { id: productId }, data: { hasVariants: true } });
    }
    // Rollup product stock cache.
    const agg = await tx.productVariant.aggregate({
      where: { productId, deletedAt: null },
      _sum: { stockQty: true },
    });
    await tx.product.update({
      where: { id: productId },
      data: { stockQty: agg._sum.stockQty ?? 0 },
    });
    return v;
  });

  return variant;
}

// ─────────────────────────── Public queries ───────────────────────────

const channelVisibility = (channel: Channel): Prisma.EnumChannelVisibilityFilter<"Product"> =>
  channel === "WHOLESALE" ? { in: ["WHOLESALE", "BOTH"] } : { in: ["RETAIL", "BOTH"] };

export async function listProducts(query: ListProductsQuery, channel: Channel) {
  const {
    page, limit, categorySlug, collectionSlug, search, gender, occasion,
    minPrice, maxPrice, featured, trending, newArrival, bestSeller, sort,
  } = query;

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    isActive: true,
    visibility: channelVisibility(channel),
    ...(channel === "WHOLESALE" ? { wholesalePrice: { not: null } } : {}),
    ...(categorySlug ? { category: { path: { contains: `/${categorySlug}/` } } } : {}),
    ...(collectionSlug ? { collections: { some: { collection: { slug: collectionSlug } } } } : {}),
    ...(gender ? { gender } : {}),
    ...(occasion ? { occasion: { has: occasion } } : {}),
    ...(minPrice != null || maxPrice != null
      ? { retailPrice: { gte: minPrice ?? undefined, lte: maxPrice ?? undefined } }
      : {}),
    ...(featured ? { isFeatured: true } : {}),
    ...(trending ? { isTrending: true } : {}),
    ...(newArrival ? { isNewArrival: true } : {}),
    ...(bestSeller ? { isBestSeller: true } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { equals: search, mode: "insensitive" } },
            { searchKeywords: { has: search.toLowerCase() } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc" ? { retailPrice: "asc" }
    : sort === "price_desc" ? { retailPrice: "desc" }
    : sort === "newest" ? { createdAt: "desc" }
    : sort === "popular" ? { soldCount: "desc" }
    : { createdAt: "desc" };

  const [total, items] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        // First two images: primary + hover-swap for product cards.
        media: { where: { type: "IMAGE" }, orderBy: { sortOrder: "asc" }, take: 2 },
        category: { select: { name: true, slug: true, path: true } },
      },
    }),
  ]);

  return {
    items: items.map((p) => serializeListProduct(p, channel)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getProductDetail(slug: string, channel: Channel) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true, path: true } },
      media: { orderBy: [{ sortOrder: "asc" }, { frameIndex: "asc" }] },
      collections: { include: { collection: { select: { name: true, slug: true } } } },
      priceTiers: { where: { isActive: true, channel: channel === "WHOLESALE" ? "WHOLESALE" : "RETAIL" } },
      variants: {
        where: { deletedAt: null, isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          attributeValues: {
            include: { attributeValue: { include: { attribute: true } } },
          },
          priceTiers: { where: { isActive: true } },
        },
      },
    },
  });

  if (
    !product || product.deletedAt || !product.isActive ||
    (channel === "RETAIL" && product.visibility === "WHOLESALE") ||
    (channel === "WHOLESALE" && (product.visibility === "RETAIL" || product.wholesalePrice == null))
  ) {
    throw notFound("Product");
  }

  const productTiers: Tier[] = product.priceTiers.map((t) => ({
    scope: "PRODUCT",
    minQty: t.minQty,
    price: t.price ? Number(t.price) : null,
    discountPercent: t.discountPercent ? Number(t.discountPercent) : null,
  }));

  const pricingProduct = {
    retailPrice: Number(product.retailPrice),
    wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
    discountType: product.discountType,
    discountValue: product.discountValue ? Number(product.discountValue) : null,
  };

  return {
    ...serializeListProduct(product, channel),
    description: product.description,
    material: product.material,
    weightGrams: product.weightGrams ? Number(product.weightGrams) : null,
    moqWholesale: product.moqWholesale,
    packSize: product.packSize,
    media: product.media,
    collections: product.collections.map((c) => c.collection),
    tiers: channel === "WHOLESALE" ? productTiers : [],
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      matrixKey: v.matrixKey,
      stockQty: v.stockQty,
      weightGrams: v.weightGrams ? Number(v.weightGrams) : null,
      unitPrice: resolveUnitPrice({
        channel,
        product: pricingProduct,
        variant: {
          retailPrice: v.retailPrice ? Number(v.retailPrice) : null,
          wholesalePrice: v.wholesalePrice ? Number(v.wholesalePrice) : null,
        },
        tiers: productTiers,
        quantity: 1,
      }),
      attributes: v.attributeValues.map((av) => ({
        attribute: av.attributeValue.attribute.name,
        code: av.attributeValue.attribute.code,
        isSizeAxis: av.attributeValue.attribute.isSizeAxis,
        value: av.attributeValue.value,
        valueCode: av.attributeValue.code,
        swatchHex: av.attributeValue.swatchHex,
      })),
    })),
  };
}

function serializeListProduct(
  p: Prisma.ProductGetPayload<{ include: { category: { select: { name: true; slug: true; path: true } } } }> & {
    media?: { url: string; thumbnailUrl: string | null; altText: string | null }[];
  },
  channel: Channel,
) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    shortDescription: p.shortDescription,
    category: p.category,
    gender: p.gender,
    occasion: p.occasion,
    hsnCode: p.hsnCode,
    taxRatePercent: Number(p.taxRatePercent),
    retailPrice: Number(p.retailPrice),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    // Wholesale price only leaks to the wholesale channel.
    wholesalePrice:
      channel === "WHOLESALE" && p.wholesalePrice ? Number(p.wholesalePrice) : undefined,
    unitPrice: resolveUnitPrice({
      channel,
      product: {
        retailPrice: Number(p.retailPrice),
        wholesalePrice: p.wholesalePrice ? Number(p.wholesalePrice) : null,
        discountType: p.discountType,
        discountValue: p.discountValue ? Number(p.discountValue) : null,
      },
    }),
    inStock: p.stockQty > 0,
    hasVariants: p.hasVariants,
    flags: {
      featured: p.isFeatured,
      trending: p.isTrending,
      newArrival: p.isNewArrival,
      bestSeller: p.isBestSeller,
    },
    rating: { avg: Number(p.avgRating), count: p.reviewCount },
    primaryImage: p.media?.[0] ?? null,
    hoverImage: p.media?.[1] ?? null,
  };
}
