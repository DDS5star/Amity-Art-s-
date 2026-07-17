import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleApiError, badRequest, notFound } from "@/lib/api";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit";
import { prisma } from "@/server/db";
import { adjustStock } from "@/lib/inventory";
import { sendTemplateMessage } from "@/server/adapters/whatsapp";

const patchSchema = z.object({
  status: z.enum([
    "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED",
  ]),
  trackingNumber: z.string().max(80).optional(),
  courierName: z.string().max(80).optional(),
  note: z.string().max(300).optional(),
  markPaid: z.boolean().optional(), // COD collected / PAY_LATER settled
});

// Forward-only transitions an admin can drive (cancel allowed pre-delivery).
const ALLOWED: Record<string, string[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "PACKED", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
};

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(req, "orders.process");
    const { id } = await ctx.params;
    const input = patchSchema.parse(await req.json());

    const order = await prisma.order.findUnique({ where: { id }, include: { items: true, user: true } });
    if (!order) throw notFound("Order");
    if (!(ALLOWED[order.status] ?? []).includes(input.status)) {
      throw badRequest(`Cannot move an order from ${order.status} to ${input.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Cancellation restocks every line.
      if (input.status === "CANCELLED") {
        for (const item of order.items) {
          if (item.productId) {
            await adjustStock(tx, {
              productId: item.productId,
              variantId: item.variantId,
              delta: item.quantity,
              reason: "ORDER_CANCELLED",
              referenceType: "Order",
              referenceId: order.orderNumber,
              actorId: auth.userId,
            });
          }
        }
        // Release PAY_LATER credit.
        if (order.paymentMethod === "PAY_LATER") {
          await tx.wholesalerProfile.updateMany({
            where: { userId: order.userId },
            data: { creditUsed: { decrement: order.totalAmount } },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          status: input.status,
          trackingNumber: input.trackingNumber,
          courierName: input.courierName,
          ...(input.status === "SHIPPED" ? { shippedAt: new Date() } : {}),
          ...(input.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
          ...(input.status === "CANCELLED" ? { cancelledAt: new Date(), paymentStatus: "REFUNDED" } : {}),
          ...(input.markPaid ? { paymentStatus: "PAID", paidAmount: order.totalAmount } : {}),
          statusHistory: {
            create: {
              fromStatus: order.status,
              toStatus: input.status,
              note: input.note,
              changedById: auth.userId,
            },
          },
        },
      });
    });

    // PAY_LATER settles on markPaid: release credit.
    if (input.markPaid && order.paymentMethod === "PAY_LATER" && order.paymentStatus !== "PAID") {
      await prisma.wholesalerProfile.updateMany({
        where: { userId: order.userId },
        data: { creditUsed: { decrement: order.totalAmount } },
      });
    }

    await audit({
      actorId: auth.userId,
      action: "order.status",
      entityType: "Order",
      entityId: id,
      before: { status: order.status },
      after: { status: input.status, markPaid: input.markPaid ?? false },
    });

    // Status WhatsApp update (best-effort).
    if (order.user.phone && ["SHIPPED", "DELIVERED"].includes(input.status)) {
      void sendTemplateMessage({
        toPhone: `91${order.user.phone}`,
        templateName: input.status === "SHIPPED" ? "order_shipped" : "order_delivered",
        bodyParams: [order.user.firstName, order.orderNumber, input.trackingNumber ?? ""],
        orderId: order.id,
        userId: order.userId,
      }).catch(() => {});
    }

    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
