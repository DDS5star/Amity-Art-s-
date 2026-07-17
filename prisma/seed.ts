/**
 * Seed: settings (warehouse 400064), attributes, shipping zones, users
 * (all 4 roles), categories, sample products with size-matrix variants,
 * wholesale price tiers, CMS starters.
 * Idempotent: upserts everywhere — safe to re-run.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";

const prisma = new PrismaClient();

const hashCombination = (valueIds: string[]) =>
  createHash("sha256").update([...valueIds].sort().join("|")).digest("hex");

async function seedSettings() {
  const settings: { key: string; value: Prisma.InputJsonValue; group: string }[] = [
    { key: "warehouse.pincode", value: "400064", group: "shipping" },
    { key: "warehouse.stateCode", value: "27", group: "shipping" }, // Maharashtra
    { key: "warehouse.city", value: "Mumbai", group: "shipping" },
    { key: "shipping.defaultZoneName", value: "Rest of India", group: "shipping" },
    { key: "shipping.outOfStockLeadDays", value: 7, group: "shipping" },
    { key: "gst.defaultRatePercent", value: 3, group: "tax" }, // imitation jewellery HSN 7117
    { key: "gst.sellerGstin", value: "", group: "tax" },
    { key: "gst.defaultHsnCode", value: "7117", group: "tax" },
    { key: "store.name", value: "Amity Arts", group: "general" },
    { key: "store.currency", value: "INR", group: "general" },
    { key: "store.whatsappNumber", value: "919322239603", group: "general" },
    { key: "integrations.whatsapp.enabled", value: false, group: "integrations" },
    { key: "integrations.razorpay.enabled", value: false, group: "integrations" },
    { key: "integrations.stripe.enabled", value: false, group: "integrations" },
    { key: "checkout.codEnabled", value: true, group: "checkout" },
    { key: "loyalty.pointsPerRupee", value: 0.02, group: "growth" },
  ];
  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {}, // never clobber admin-edited values
      create: s,
    });
  }
  console.log(`✓ ${settings.length} site settings`);
}

async function seedAttributes() {
  const defs: {
    name: string;
    code: string;
    isSizeAxis?: boolean;
    sortOrder: number;
    values: { value: string; code: string; swatchHex?: string }[];
  }[] = [
    {
      name: "Plating", code: "plating", sortOrder: 1,
      values: [
        { value: "Gold", code: "gold", swatchHex: "#D4AF37" },
        { value: "Rose Gold", code: "rose-gold", swatchHex: "#B76E79" },
        { value: "Silver", code: "silver", swatchHex: "#C0C0C0" },
        { value: "Antique", code: "antique", swatchHex: "#8B7355" },
      ],
    },
    {
      name: "Colour", code: "colour", sortOrder: 2,
      values: [
        { value: "White", code: "white", swatchHex: "#FFFFFF" },
        { value: "Green", code: "green", swatchHex: "#2E8B57" },
        { value: "Blue", code: "blue", swatchHex: "#4169E1" },
        { value: "Black", code: "black", swatchHex: "#111111" },
        { value: "Red", code: "red", swatchHex: "#C41E3A" },
        { value: "Pink", code: "pink", swatchHex: "#FFC0CB" },
      ],
    },
    {
      name: "Stone", code: "stone", sortOrder: 3,
      values: [
        { value: "American Diamond", code: "american-diamond" },
        { value: "CZ", code: "cz" },
        { value: "Kundan", code: "kundan" },
        { value: "Pearl", code: "pearl" },
        { value: "Polki", code: "polki" },
        { value: "Ruby", code: "ruby" },
        { value: "Emerald", code: "emerald" },
      ],
    },
    {
      name: "Finish", code: "finish", sortOrder: 4,
      values: [
        { value: "Matte", code: "matte" },
        { value: "Gloss", code: "gloss" },
        { value: "Antique", code: "antique" },
      ],
    },
    {
      name: "Size", code: "size", isSizeAxis: true, sortOrder: 5,
      values: [
        { value: "2.2", code: "2.2" },
        { value: "2.4", code: "2.4" },
        { value: "2.6", code: "2.6" },
        { value: "2.8", code: "2.8" },
      ],
    },
  ];

  for (const def of defs) {
    const attr = await prisma.attribute.upsert({
      where: { code: def.code },
      update: { isSizeAxis: def.isSizeAxis ?? false },
      create: {
        name: def.name,
        code: def.code,
        isSizeAxis: def.isSizeAxis ?? false,
        sortOrder: def.sortOrder,
      },
    });
    for (const [i, v] of def.values.entries()) {
      await prisma.attributeValue.upsert({
        where: { attributeId_code: { attributeId: attr.id, code: v.code } },
        update: {},
        create: { attributeId: attr.id, ...v, sortOrder: i },
      });
    }
  }
  console.log(`✓ ${defs.length} attributes with values`);
}

async function seedShippingZones() {
  // Zone → representative pincode prefixes (3-digit). Coarse starter set;
  // admin can refine. Warehouse: 400064 (Mumbai → "400" is Local).
  const zones: {
    name: string; minDays: number; maxDays: number; baseRate: number;
    freeAbove?: number; codAvailable: boolean; prefixes: string[];
  }[] = [
    { name: "Local (Mumbai)", minDays: 1, maxDays: 2, baseRate: 40, freeAbove: 999, codAvailable: true,
      prefixes: ["400", "401", "421"] },
    { name: "Zonal (Maharashtra & Gujarat)", minDays: 2, maxDays: 4, baseRate: 60, freeAbove: 999, codAvailable: true,
      prefixes: ["402", "403", "410", "411", "412", "413", "414", "415", "416", "422", "431", "440", "380", "390", "395"] },
    { name: "Metro", minDays: 3, maxDays: 5, baseRate: 80, freeAbove: 1499, codAvailable: true,
      prefixes: ["110", "560", "600", "500", "700", "302", "226"] },
    { name: "Rest of India", minDays: 4, maxDays: 7, baseRate: 100, freeAbove: 1499, codAvailable: true,
      prefixes: [] }, // fallback zone — no prefixes needed
    { name: "North-East / J&K", minDays: 6, maxDays: 10, baseRate: 150, codAvailable: false,
      prefixes: ["190", "781", "790", "793", "795", "796", "797", "798", "799"] },
  ];

  for (const z of zones) {
    let zone = await prisma.shippingZone.findFirst({ where: { name: z.name } });
    if (!zone) {
      zone = await prisma.shippingZone.create({
        data: {
          name: z.name, minDays: z.minDays, maxDays: z.maxDays,
          baseRate: z.baseRate, freeAbove: z.freeAbove, codAvailable: z.codAvailable,
        },
      });
    }
    for (const prefix of z.prefixes) {
      await prisma.pincodeZone.upsert({
        where: { pincodePrefix: prefix },
        update: {},
        create: { pincodePrefix: prefix, zoneId: zone.id },
      });
    }
  }
  console.log(`✓ ${zones.length} shipping zones + pincode prefixes`);
}

async function seedUsers() {
  const users = [
    { email: "admin@amityarts.in", password: "Admin@12345", firstName: "Super", lastName: "Admin", role: "SUPER_ADMIN" as const, referralCode: "AMITY-ADMIN" },
    { email: "manager@amityarts.in", password: "Manager@12345", firstName: "Store", lastName: "Manager", role: "MANAGER" as const, referralCode: "AMITY-MGR" },
    { email: "wholesaler@amityarts.in", password: "Wholesale@12345", firstName: "Bulk", lastName: "Buyer", role: "WHOLESALER" as const, referralCode: "AMITY-WHL", phone: "9822001100" },
    { email: "customer@amityarts.in", password: "Customer@12345", firstName: "Retail", lastName: "Customer", role: "CUSTOMER" as const, referralCode: "AMITY-CUST", phone: "9876543210" },
  ];

  const created: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: await bcrypt.hash(u.password, 12),
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        referralCode: u.referralCode,
        phone: (u as { phone?: string }).phone,
        emailVerifiedAt: new Date(),
      },
    });
    created[u.role] = user.id;
  }

  await prisma.wholesalerProfile.upsert({
    where: { userId: created.WHOLESALER },
    update: {},
    create: {
      userId: created.WHOLESALER,
      companyName: "Bulk Buyer Traders",
      gstin: "27ABCDE1234F1Z5",
      status: "APPROVED",
      approvedById: created.SUPER_ADMIN,
      approvedAt: new Date(),
      creditLimit: 200000,
      creditDays: 30,
    },
  });
  console.log("✓ 4 users (super admin, manager, approved wholesaler, customer)");
  return created;
}

async function seedCatalog() {
  const cats = [
    { name: "Necklaces", slug: "necklaces" },
    { name: "Earrings", slug: "earrings" },
    { name: "Bangles", slug: "bangles" },
    { name: "Rings", slug: "rings" },
    { name: "Bridal Collection", slug: "bridal-collection" },
  ];
  const catIds: Record<string, string> = {};
  for (const [i, c] of cats.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug, path: `/${c.slug}/`, depth: 0, sortOrder: i },
    });
    catIds[c.slug] = cat.id;
  }
  // one nested example: Jhumkas under Earrings
  await prisma.category.upsert({
    where: { slug: "jhumkas" },
    update: {},
    create: {
      name: "Jhumkas", slug: "jhumkas", parentId: catIds["earrings"],
      path: "/earrings/jhumkas/", depth: 1,
    },
  });

  const size = await prisma.attribute.findUniqueOrThrow({ where: { code: "size" }, include: { values: true } });
  const plating = await prisma.attribute.findUniqueOrThrow({ where: { code: "plating" }, include: { values: true } });
  const gold = plating.values.find((v) => v.code === "gold")!;

  // Product 1: bangle with Gold plating × 4 sizes (the wholesale size-matrix case)
  const bangle = await prisma.product.upsert({
    where: { slug: "kundan-gold-bangle-set" },
    update: {},
    create: {
      name: "Kundan Gold Bangle Set",
      slug: "kundan-gold-bangle-set",
      sku: "AA-BNG-0001",
      categoryId: catIds["bangles"],
      gender: "WOMEN",
      occasion: ["wedding", "festive"],
      shortDescription: "Handcrafted kundan bangle set with 18k gold plating.",
      description: "Traditional kundan work bangle set, hypoallergenic brass base with premium 18k gold plating.",
      material: "Brass, 18k gold plated",
      hsnCode: "7117",
      weightGrams: 45.5,
      retailPrice: 2499,
      wholesalePrice: 1450,
      compareAtPrice: 3299,
      taxRatePercent: 3,
      hasVariants: true,
      moqWholesale: 12,
      packSize: 4,
      isFeatured: true,
      isBestSeller: true,
      searchKeywords: ["kundan", "bangle", "gold", "bridal"],
    },
  });

  for (const [i, sv] of size.values.entries()) {
    const hash = hashCombination([gold.id, sv.id]);
    const variant = await prisma.productVariant.upsert({
      where: { productId_combinationHash: { productId: bangle.id, combinationHash: hash } },
      update: {},
      create: {
        productId: bangle.id,
        sku: `AA-BNG-0001-G${sv.code.replace(".", "")}`,
        title: `Gold / ${sv.value}`,
        matrixKey: "gold",
        combinationHash: hash,
        weightGrams: 45.5,
        stockQty: 120,
        sortOrder: i,
      },
    });
    await prisma.variantAttributeValue.createMany({
      data: [
        { variantId: variant.id, attributeValueId: gold.id },
        { variantId: variant.id, attributeValueId: sv.id },
      ],
      skipDuplicates: true,
    });
  }
  // product-level stock rollup
  await prisma.product.update({ where: { id: bangle.id }, data: { stockQty: 480 } });

  // Wholesale quantity-break tiers on the bangle (product level)
  const tiers = [
    { minQty: 12, discountPercent: 0 },
    { minQty: 48, discountPercent: 5 },
    { minQty: 96, discountPercent: 10 },
  ];
  for (const t of tiers) {
    const existing = await prisma.priceTier.findFirst({
      where: { productId: bangle.id, variantId: null, channel: "WHOLESALE", minQty: t.minQty },
    });
    if (!existing) {
      await prisma.priceTier.create({
        data: { productId: bangle.id, channel: "WHOLESALE", minQty: t.minQty, discountPercent: t.discountPercent },
      });
    }
  }

  // Product 2: simple no-variant necklace (retail-focused)
  await prisma.product.upsert({
    where: { slug: "pearl-drop-necklace" },
    update: {},
    create: {
      name: "Pearl Drop Necklace",
      slug: "pearl-drop-necklace",
      sku: "AA-NCK-0001",
      categoryId: catIds["necklaces"],
      gender: "WOMEN",
      occasion: ["office", "daily"],
      shortDescription: "Minimal freshwater pearl drop on a sterling chain.",
      material: "925 silver, freshwater pearl",
      hsnCode: "7117",
      weightGrams: 12.3,
      retailPrice: 1299,
      wholesalePrice: 780,
      taxRatePercent: 3,
      stockQty: 200,
      isNewArrival: true,
      searchKeywords: ["pearl", "necklace", "silver", "minimal"],
    },
  });

  // Product 3: wholesale-only jhumka
  const jhumkaCat = await prisma.category.findUniqueOrThrow({ where: { slug: "jhumkas" } });
  await prisma.product.upsert({
    where: { slug: "antique-temple-jhumka" },
    update: {},
    create: {
      name: "Antique Temple Jhumka",
      slug: "antique-temple-jhumka",
      sku: "AA-JHK-0001",
      categoryId: jhumkaCat.id,
      gender: "WOMEN",
      occasion: ["festive", "temple"],
      shortDescription: "South-Indian temple work jhumka, antique finish.",
      material: "Brass, antique gold plated",
      hsnCode: "7117",
      weightGrams: 28,
      retailPrice: 899,
      wholesalePrice: 520,
      taxRatePercent: 3,
      stockQty: 350,
      visibility: "WHOLESALE",
      moqWholesale: 24,
      packSize: 6,
      searchKeywords: ["jhumka", "temple", "antique"],
    },
  });

  console.log("✓ 6 categories, 3 products (1 with size-matrix variants + tiers)");
}

/** Placeholder photography wired through ProductMedia — replace URLs with real shots later. */
async function seedMediaAndMoreProducts() {
  const cat = async (slug: string) =>
    (await prisma.category.findUniqueOrThrow({ where: { slug } })).id;

  const more: {
    name: string; slug: string; sku: string; category: string;
    price: number; wholesale: number; compareAt?: number; occasion: string[];
    short: string; material: string; weight: number;
    flags?: Partial<Record<"isFeatured" | "isTrending" | "isNewArrival" | "isBestSeller", boolean>>;
  }[] = [
    {
      name: "Polki Chandbali Earrings", slug: "polki-chandbali-earrings", sku: "AA-ERG-0002",
      category: "earrings", price: 1899, wholesale: 1120, compareAt: 2399,
      occasion: ["wedding", "festive"], short: "Crescent chandbalis with uncut polki and pearl drops.",
      material: "Brass, 22k gold plated, polki", weight: 32,
      flags: { isFeatured: true, isBestSeller: true },
    },
    {
      name: "Emerald Cut CZ Cocktail Ring", slug: "emerald-cut-cz-cocktail-ring", sku: "AA-RNG-0001",
      category: "rings", price: 1149, wholesale: 690,
      occasion: ["party", "office"], short: "A single emerald-cut CZ on a tapered band.",
      material: "925 silver, cubic zirconia", weight: 8.4,
      flags: { isNewArrival: true, isTrending: true },
    },
    {
      name: "Temple Coin Necklace", slug: "temple-coin-necklace", sku: "AA-NCK-0002",
      category: "necklaces", price: 2199, wholesale: 1340, compareAt: 2799,
      occasion: ["festive", "temple"], short: "Lakshmi coin strand in an antique temple finish.",
      material: "Brass, antique gold plated", weight: 58,
      flags: { isFeatured: true, isBestSeller: true },
    },
    {
      name: "Rose Quartz Stud Earrings", slug: "rose-quartz-stud-earrings", sku: "AA-ERG-0003",
      category: "earrings", price: 749, wholesale: 440,
      occasion: ["daily", "office"], short: "Bezel-set rose quartz studs for every day.",
      material: "925 silver, rose quartz", weight: 4.2,
      flags: { isNewArrival: true },
    },
    {
      name: "Bridal Kundan Choker Set", slug: "bridal-kundan-choker-set", sku: "AA-NCK-0003",
      category: "bridal-collection", price: 6499, wholesale: 3900, compareAt: 7999,
      occasion: ["wedding"], short: "Full kundan choker with matching earrings and maang tikka.",
      material: "Brass, 22k gold plated, kundan, pearls", weight: 145,
      flags: { isFeatured: true, isTrending: true },
    },
  ];

  for (const p of more) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name, slug: p.slug, sku: p.sku, categoryId: await cat(p.category),
        gender: "WOMEN", occasion: p.occasion, shortDescription: p.short,
        description: `${p.short} Handcrafted in Mumbai with hypoallergenic, nickel-free plating.`,
        material: p.material, hsnCode: "7117", weightGrams: p.weight,
        retailPrice: p.price, wholesalePrice: p.wholesale, compareAtPrice: p.compareAt,
        taxRatePercent: 3, stockQty: 80, searchKeywords: p.slug.split("-"),
        ...p.flags,
      },
    });
  }

  // Attach placeholder media to every product that has none.
  const products = await prisma.product.findMany({ where: { media: { none: {} } } });
  for (const product of products) {
    await prisma.productMedia.createMany({
      data: [0, 1, 2].map((i) => ({
        productId: product.id,
        type: "IMAGE" as const,
        url: `https://picsum.photos/seed/${product.slug}-${i}/1200/1500`,
        thumbnailUrl: `https://picsum.photos/seed/${product.slug}-${i}/480/600`,
        altText: product.name,
        sortOrder: i,
        isPrimary: i === 0,
      })),
    });
  }

  // A curated collection for the homepage rail.
  const collection = await prisma.collection.upsert({
    where: { slug: "the-wedding-edit" },
    update: {},
    create: {
      name: "The Wedding Edit", slug: "the-wedding-edit",
      description: "Kundan, polki and pearl pieces for the big day.",
      imageUrl: "https://picsum.photos/seed/wedding-edit/1600/900",
    },
  });
  const bridalProducts = await prisma.product.findMany({
    where: { occasion: { has: "wedding" }, deletedAt: null },
    take: 4,
  });
  for (const [i, bp] of bridalProducts.entries()) {
    await prisma.productCollection.upsert({
      where: { productId_collectionId: { productId: bp.id, collectionId: collection.id } },
      update: {},
      create: { productId: bp.id, collectionId: collection.id, sortOrder: i },
    });
  }

  const testimonialCount = await prisma.testimonial.count();
  if (testimonialCount === 0) {
    await prisma.testimonial.createMany({
      data: [
        {
          name: "Meenakshi Iyer", rating: 5, sortOrder: 0,
          content: "The kundan set survived three weddings and still looks like the day it arrived.",
          imageUrl: "https://picsum.photos/seed/meenakshi-portrait/200/200",
        },
        {
          name: "Ritika Malhotra", rating: 5, sortOrder: 1,
          content: "Ordered on a Tuesday, wore it to the sangeet on Friday. The plating is remarkable for the price.",
          imageUrl: "https://picsum.photos/seed/ritika-portrait/200/200",
        },
        {
          name: "Farah Ansari", rating: 4, sortOrder: 2,
          content: "My mother thought the polki chandbalis were heirloom pieces. I let her believe it.",
          imageUrl: "https://picsum.photos/seed/farah-portrait/200/200",
        },
      ],
    });
  }

  console.log(`✓ ${more.length} retail products, media for all, wedding collection, testimonials`);
}

async function seedCms() {
  const existing = await prisma.announcementBar.findFirst();
  if (!existing) {
    await prisma.announcementBar.create({
      data: { text: "Free shipping on orders above ₹999 ✨", isActive: true },
    });
  }
  const faqCount = await prisma.fAQ.count();
  if (faqCount === 0) {
    await prisma.fAQ.createMany({
      data: [
        { question: "Is your jewellery hypoallergenic?", answer: "Yes — all pieces use nickel-free brass or 925 silver bases.", category: "product", sortOrder: 0 },
        { question: "How do I become a wholesale partner?", answer: "Register as a wholesaler with your GSTIN; our team approves accounts within 48 hours.", category: "wholesale", sortOrder: 1 },
      ],
    });
  }
  console.log("✓ CMS starters (announcement, FAQs)");
}

async function main() {
  await seedSettings();
  await seedAttributes();
  await seedShippingZones();
  await seedUsers();
  await seedCatalog();
  await seedMediaAndMoreProducts();
  await seedCms();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete ✅");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
