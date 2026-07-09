import { z } from "zod";

const slug = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case only");
const money = z.number().nonnegative().multipleOf(0.01);

export const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
  slug: slug.optional(),
  parentId: z.string().cuid().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  metaTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(320).optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial().extend({
  parentId: z.string().cuid().nullable().optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

const mediaSchema = z.object({
  type: z.enum(["IMAGE", "VIDEO", "IMAGE_360", "MODEL_3D"]),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  altText: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).default(0),
  frameIndex: z.number().int().min(0).optional(),
  isPrimary: z.boolean().default(false),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  slug: slug.optional(),
  sku: z.string().min(1).max(60),
  barcode: z.string().max(60).optional(),
  categoryId: z.string().cuid(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]).default("UNISEX"),
  occasion: z.array(z.string().max(40)).default([]),
  shortDescription: z.string().max(300).optional(),
  description: z.string().max(20000).optional(),
  material: z.string().max(200).optional(),
  hsnCode: z.string().max(10).optional(),
  weightGrams: z.number().positive().optional(),
  retailPrice: money,
  wholesalePrice: money.nullable().optional(),
  compareAtPrice: money.optional(),
  discountType: z.enum(["PERCENT", "FIXED"]).optional(),
  discountValue: money.optional(),
  taxRatePercent: z.number().min(0).max(100).default(3),
  stockQty: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(5),
  minOrderQty: z.number().int().min(1).default(1),
  maxOrderQty: z.number().int().min(1).optional(),
  moqWholesale: z.number().int().min(1).default(1),
  packSize: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  visibility: z.enum(["RETAIL", "WHOLESALE", "BOTH"]).default("BOTH"),
  metaTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(320).optional(),
  searchKeywords: z.array(z.string().max(60)).default([]),
  media: z.array(mediaSchema).optional(),
  collectionIds: z.array(z.string().cuid()).optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().omit({ sku: true });
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const createVariantSchema = z.object({
  sku: z.string().min(1).max(60),
  barcode: z.string().max(60).optional(),
  attributeValueIds: z.array(z.string().cuid()).min(1).max(8),
  retailPrice: money.nullable().optional(),
  wholesalePrice: money.nullable().optional(),
  weightGrams: z.number().positive().optional(),
  stockQty: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});
export type CreateVariantInput = z.infer<typeof createVariantSchema>;

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  categorySlug: slug.optional(),
  collectionSlug: slug.optional(),
  search: z.string().max(120).optional(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]).optional(),
  occasion: z.string().max(40).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  featured: z.coerce.boolean().optional(),
  trending: z.coerce.boolean().optional(),
  newArrival: z.coerce.boolean().optional(),
  bestSeller: z.coerce.boolean().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "popular"]).default("newest"),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
