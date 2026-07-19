import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { verifyWebhookSignature } from "@/server/adapters/razorpay";

/**
 * Razorpay webhook (optional but recommended): marks orders paid even when the
 * customer closes the tab before our client-side verify runs.
 * Configure in the Razorpay dashboard with the `payment.captured` event.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const event = JSON.parse(raw) as {
      event: string;
      payload?: { payment?: { entity?: { id: string; order_id: string; amount: number } } };
    };

    if (event.event === "payment.captured" && event.payload?.payment?.entity) {
      const { id: paymentId, order_id: gatewayOrderId } = event.payload.payment.entity;
      const payment = await prisma.payment.findFirst({
        where: { gatewayOrderId, method: "RAZORPAY" },
        include: { order: true },
      });
      if (payment && payment.order.paymentStatus !== "PAID") {
        await prisma.$transaction([
          prisma.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: "PAID", paidAmount: payment.order.totalAmount },
          }),
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: "PAID", gatewayPaymentId: paymentId, paidAt: new Date() },
          }),
        ]);
      }
    }
  } catch (err) {
    console.error("[razorpay webhook] processing error:", err);
    // Still 200 so Razorpay doesn't retry forever on malformed payloads we logged.
  }

  return NextResponse.json({ ok: true });
}
