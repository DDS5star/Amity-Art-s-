import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { ApiError, badRequest, forbidden, notFound } from "@/lib/api";
import { adjustStock, InsufficientStockError } from "@/lib/inventory";
import { resolveUnitPrice, validateWholesaleQty, type Channel, type Tier } from "@/lib/pricing";
import { computeOrderTotals, formatOrderNumber } from "@/lib/order-totals";
import { estimateDelivery } from "@/lib/delivery-estimate";
import { zoneForPincode } from "./shipping";
import { getWarehouseStateCode, getOutOfStockLeadDays } from "./settings";
import { notifyOrderPlaced } from "@/server/adapters/whatsapp";
import type { CreateOrderInput } from "@/lib/validation/orders";

/**
 * Order placement — server-authoritative pricing, oversell-safe stock,
 * PAY_LATER credit enforcement, GST split, WhatsApp notification.
 */
export async function createOrder(userId: string, channel: Channel, input: CreateOrderInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wholesalerProfile: true },
  });
  if (!user || !user.isActive) throw forbidden("Account unavailable");

  // Channel + payment-method gates
  if (channel === "WHOLESALE") {
    if (user.wholesalerProfile?.status !== "APPROVED") {
      throw forbidden("Wholesale ordering requires an approved account");
    }
  } else if (input.paymentMethod === "PAY_LATER") {
    throw badRequest("Pay later is available to approved wholesalers only");
  }

  // Load and validate every product/variant referenced.
  const productIds = [...new Set(input.lines.map((l) => l.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null, isActive: true },
    include: {
      priceTiers: { where: { isActive: true } },
      variants: { where: { deletedAt: null } },
    },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  interface PricedLine {
    productId: string;
    variantId: string | null;
    name: string;
    sku: string;
    variantTitle: string | null;
    imageUrl: string | null;
    hsnCode: string | null;
    quantity: number;
    unitPrice: number;
    taxRatePercent: number;
  }

  const priced: PricedLine[] = [];
  // Wholesale tier/MOQ quantities aggregate per product (size-matrix group sum).
  const perProductQty = new Map<string, number>();
  for (const l of input.lines) {
    perProductQty.set(l.productId, (perProductQty.get(l.productId) ?? 0) + l.quantity);
  }

  const media = await prisma.productMedia.findMany({
    where: { productId: { in: productIds }, type: "IMAGE", isPrimary: true },
  });
  const mediaMap = new Map(media.map((m) => [m.productId, m.url]));

  for (const line of input.lines) {
    const product = productMap.get(line.productId);
    if (!product) throw notFound("One of the products");

    const allowed =
      product.visibility === "BOTH" ||
      (channel === "RETAIL" && product.visibility === "RETAIL") ||
      (channel === "WHOLESALE" && product.visibility === "WHOLESALE");
    if (!allowed) throw badRequest(`${product.name} is not available on this channel`);

    const variant = line.variantId
      ? product.variants.find((v) => v.id === line.variantId && v.isActive)
      : null;
    if (line.variantId && !variant) throw notFound(`Selected option for ${product.name}`);
    if (!line.variantId && product.hasVariants) {
      throw badRequest(`${product.name} requires a variant selection`);
    }

    const groupQty = perProductQty.get(line.productId)!;
    if (channel === "WHOLESALE") {
      const check = validateWholesaleQty(groupQty, product.moqWholesale, product.packSize);
      if (!check.ok) throw badRequest(`${product.name}: ${check.reason}`);
    } else {
      if (line.quantity < product.minOrderQty) {
        throw badRequest(`${product.name}: minimum order quantity is ${product.minOrderQty}`);
      }
      if (product.maxOrderQty && line.quantity > product.maxOrderQty) {
        throw badRequest(`${product.name}: maximum order quantity is ${product.maxOrderQty}`);
      }
    }

    const tiers: Tier[] = product.priceTiers
      .filter((t) => t.channel === channel)
      .map((t) => ({
        scope: t.variantId ? ("VARIANT" as const) : ("PRODUCT" as const),
        minQty: t.minQty,
        price: t.price ? Number(t.price) : null,
        discountPercent: t.discountPercent ? Number(t.discountPercent) : null,
      }));

    const unitPrice = resolveUnitPrice({
      channel,
      product: {
        retailPrice: Number(product.retailPrice),
        wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
        discountType: product.discountType,
        discountValue: product.discountValue ? Number(product.discountValue) : null,
      },
      variant: variant
        ? {
            retailPrice: variant.retailPrice ? Number(variant.retailPrice) : null,
            wholesalePrice: variant.wholesalePrice ? Number(variant.wholesalePrice) : null,
          }
        : null,
      tiers,
      quantity: groupQty,
    });

    priced.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      sku: variant?.sku ?? product.sku,
      variantTitle: variant?.title ?? null,
      imageUrl: mediaMap.get(product.id) ?? null,
      hsnCode: product.hsnCode,
      quantity: line.quantity,
      unitPrice,
      taxRatePercent: Number(product.taxRatePercent),
    });
  }

  // Shipping zone + ETA + totals
  const zone = await zoneForPincode(input.shippingAddress.pincode);
  if (input.paymentMethod === "COD" && !zone.codAvailable) {
    throw badRequest("Cash on delivery is not available for this pincode");
  }
  const sellerStateCode = await getWarehouseStateCode();

  const totals = computeOrderTotals({
    channel,
    lines: priced,
    customerStateCode: input.shippingAddress.stateCode,
    sellerStateCode,
    shipping: {
      baseRate: Number(zone.baseRate),
      freeAbove: zone.freeAbove ? Number(zone.freeAbove) : null,
    },
  });

  // PAY_LATER credit enforcement
  if (input.paymentMethod === "PAY_LATER") {
    const profile = user.wholesalerProfile!;
    if (profile.creditDays <= 0) {
      throw badRequest("Pay later is not enabled on your account yet");
    }
    const available = Number(profile.creditLimit) - Number(profile.creditUsed);
    if (totals.totalAmount > available) {
      throw badRequest(
        `Order exceeds your available credit of ₹${available.toLocaleString("en-IN")}`,
      );
    }
  }

  const eta = estimateDelivery({
    zone: { zoneName: zone.name, minDays: zone.minDays, maxDays: zone.maxDays },
    inStock: true, // stock is validated transactionally below
    outOfStockLeadDays: await getOutOfStockLeadDays(),
  });

  const year = new Date().getFullYear();
  const dueDate =
    input.paymentMethod === "PAY_LATER"
      ? new Date(Date.now() + user.wholesalerProfile!.creditDays * 24 * 60 * 60 * 1000)
      : null;

  // Transaction: stock + order + payment + credit, all-or-nothing.
  // Order-number uniqueness handled by retrying on collision.
  let order;
  for (let attempt = 0; ; attempt++) {
    const seq =
      (await prisma.order.count({ where: { channel, placedAt: { gte: new Date(year, 0, 1) } } })) +
      1 +
      attempt;
    const orderNumber = formatOrderNumber(channel, year, seq);
    try {
      order = await prisma.$transaction(async (tx) => {
        for (const l of priced) {
          await adjustStock(tx, {
            productId: l.productId,
            variantId: l.variantId,
            delta: -l.quantity,
            reason: "ORDER_PLACED",
            referenceType: "Order",
            referenceId: orderNumber,
            actorId: userId,
          });
        }

        const created = await tx.order.create({
          data: {
            orderNumber,
            channel,
            userId,
            status: "CONFIRMED",
            subtotal: totals.subtotal,
            shippingAmount: totals.shippingAmount,
            cgstAmount: totals.gst.cgst,
            sgstAmount: totals.gst.sgst,
            igstAmount: totals.gst.igst,
            taxAmount: totals.gst.total,
            totalAmount: totals.totalAmount,
            placeOfSupplyState: input.shippingAddress.stateCode,
            isInterState: totals.gst.isInterState,
            buyerGstin: channel === "WHOLESALE" ? user.wholesalerProfile?.gstin : null,
            paymentMethod: input.paymentMethod,
            paymentStatus: "PENDING",
            dueDate,
            shippingAddress: input.shippingAddress as unknown as Prisma.InputJsonValue,
            shippingZoneId: zone.id,
            estimatedDeliveryMin: eta.earliest,
            estimatedDeliveryMax: eta.latest,
            customerNote: input.customerNote,
            items: {
              create: priced.map((l, i) => ({
                productId: l.productId,
                variantId: l.variantId,
                name: l.name,
                sku: l.sku,
                variantTitle: l.variantTitle,
                imageUrl: l.imageUrl,
                hsnCode: l.hsnCode,
                unitPrice: l.unitPrice,
                quantity: l.quantity,
                taxRatePercent: l.taxRatePercent,
                taxAmount: totals.lines[i].taxAmount,
                lineTotal: totals.lines[i].lineTotal,
              })),
            },
            statusHistory: {
              create: { toStatus: "CONFIRMED", note: "Order placed", changedById: userId },
            },
            payments: {
              create: {
                method: input.paymentMethod,
                status: "PENDING",
                amount: totals.totalAmount,
              },
            },
          },
          include: { items: true },
        });

        if (input.paymentMethod === "PAY_LATER") {
          await tx.wholesalerProfile.update({
            where: { userId },
            data: { creditUsed: { increment: totals.totalAmount } },
          });
        }

        await tx.product.updateMany({
          where: { id: { in: productIds } },
          data: { soldCount: { increment: 1 } },
        });

        return created;
      });
      break;
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        throw new ApiError(409, "OUT_OF_STOCK", `${err.message} — please adjust quantities`);
      }
      // Order-number collision under concurrency: retry with the next sequence.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        attempt < 3
      ) {
        continue;
      }
      throw err;
    }
  }

  // Post-commit side effects (never fail the order):
  if (user.phone) {
    void notifyOrderPlaced({
      phone: `91${user.phone}`,
      customerName: user.firstName,
      orderNumber: order.orderNumber,
      totalAmount: `₹${Number(order.totalAmount).toLocaleString("en-IN")}`,
      orderId: order.id,
      userId,
    }).catch(() => {});
  }
  await prisma.notification
    .create({
      data: {
        userId,
        type: "ORDER_UPDATE",
        title: `Order ${order.orderNumber} confirmed`,
        body: `We're preparing your order. Estimated delivery ${eta.earliest.toLocaleDateString("en-IN")} to ${eta.latest.toLocaleDateString("en-IN")}.`,
        data: { orderId: order.id },
      },
    })
    .catch(() => {});

  return order;
}

export async function listMyOrders(userId: string, page = 1, limit = 20) {
  const [total, items] = await prisma.$transaction([
    prisma.order.count({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, orderNumber: true, channel: true, status: true,
        paymentMethod: true, paymentStatus: true, totalAmount: true,
        placedAt: true, estimatedDeliveryMax: true, dueDate: true,
        _count: { select: { items: true } },
      },
    }),
  ]);
  return { items, pagination: { page, limit, total } };
}

export async function getOrder(orderId: string, requesterId: string, isStaff: boolean) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      payments: true,
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });
  if (!order) throw notFound("Order");
  if (!isStaff && order.userId !== requesterId) throw notFound("Order");
  return order;
}
