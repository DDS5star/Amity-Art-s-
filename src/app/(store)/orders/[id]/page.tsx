"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle, FilePdf, Warning } from "@phosphor-icons/react";
import { useStoreAuth, restoreStoreSession, storeJson, storeFetch } from "@/components/account/auth";
import { payWithRazorpay, type RazorpaySession } from "@/components/account/razorpay";
import { formatINR } from "@/lib/money";

interface OrderDetail {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: string;
  shippingAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  taxAmount: string;
  totalAmount: string;
  dueDate: string | null;
  estimatedDeliveryMin: string | null;
  estimatedDeliveryMax: string | null;
  trackingNumber: string | null;
  courierName: string | null;
  placedAt: string;
  shippingAddress: { fullName: string; line1: string; line2?: string; city: string; state: string; pincode: string; phone: string };
  items: { id: string; name: string; variantTitle: string | null; imageUrl: string | null; quantity: number; unitPrice: string; lineTotal: string }[];
  statusHistory: { id: string; toStatus: string; note: string | null; createdAt: string }[];
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

function OrderView() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const justPlaced = params.get("placed") === "1";
  const { status, user } = useStoreAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (status === "unknown") void restoreStoreSession();
    if (status === "authed") {
      storeJson<OrderDetail>(`/api/orders/${id}`).then(setOrder).catch((e) => setError(e.message));
    }
    if (status === "guest") setError("Sign in to view this order.");
  }, [status, id]);

  const needsPayment =
    order?.paymentMethod === "RAZORPAY" && order.paymentStatus !== "PAID" && order.status !== "CANCELLED";

  const invoiceReady =
    !!order &&
    order.status !== "CANCELLED" &&
    (order.paymentStatus === "PAID" ||
      order.channel === "WHOLESALE" ||
      ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status));

  const downloadInvoice = async () => {
    const res = await storeFetch(`/api/orders/${id}/invoice`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setPayError(body?.error?.message ?? "Invoice unavailable");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const payNow = async () => {
    if (!order) return;
    setPaying(true);
    setPayError("");
    try {
      const session = await storeJson<RazorpaySession & { orderNumber: string }>(
        "/api/payments/razorpay/session",
        { method: "POST", body: JSON.stringify({ orderId: order.id }) },
      );
      await payWithRazorpay({
        session,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: {
          name: order.shippingAddress.fullName,
          email: user?.email ?? "",
          phone: order.shippingAddress.phone,
        },
      });
      const fresh = await storeJson<OrderDetail>(`/api/orders/${id}`);
      setOrder(fresh);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-ink-700">{error}</p>
        <Link href={`/account/login?next=/orders/${id}`} className="mt-4 inline-block text-gold-700 underline underline-offset-4">
          Sign in
        </Link>
      </div>
    );
  }
  if (!order) return <div className="max-w-3xl mx-auto px-4 py-24 text-sm text-ink-400">Loading order…</div>;

  const gst = Number(order.taxAmount);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {justPlaced && (
        <div className="mb-8 rounded-2xl bg-emerald-50 border border-emerald-200 p-6 flex items-start gap-4">
          <CheckCircle size={28} weight="fill" className="text-emerald-600 shrink-0" />
          <div>
            <p className="font-display text-2xl text-ink-950">Order placed. Thank you!</p>
            <p className="mt-1 text-sm text-ink-700">
              We&apos;ve sent a WhatsApp confirmation
              {order.estimatedDeliveryMin
                ? ` — expect delivery ${fmtDate(order.estimatedDeliveryMin)} to ${fmtDate(order.estimatedDeliveryMax!)}`
                : ""}
              .
            </p>
          </div>
        </div>
      )}

      {needsPayment && (
        <div className="mb-8 rounded-2xl bg-gold-100 border border-gold-500/40 p-6 flex items-start gap-4 flex-wrap">
          <Warning size={26} weight="fill" className="text-gold-800 shrink-0" />
          <div className="flex-1 min-w-[220px]">
            <p className="font-display text-xl text-ink-950">Payment pending</p>
            <p className="mt-1 text-sm text-ink-700">
              Your order is reserved. Complete the payment to start processing.
            </p>
            {payError && <p className="mt-2 text-sm text-red-700">{payError}</p>}
          </div>
          <button
            type="button"
            disabled={paying}
            onClick={payNow}
            className="cta-shimmer px-7 py-3 rounded-full bg-gold-700 text-white text-sm font-semibold hover:bg-gold-800 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {paying ? "Opening payment…" : `Pay ${formatINR(Number(order.totalAmount))}`}
          </button>
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-950">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-ink-500">
            Placed {fmtDate(order.placedAt)} · {order.channel === "WHOLESALE" ? "Wholesale" : "Retail"} ·{" "}
            {order.paymentMethod === "PAY_LATER"
              ? `Pay later${order.dueDate ? `, due ${fmtDate(order.dueDate)}` : ""}`
              : order.paymentMethod}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {invoiceReady && (
            <button
              type="button"
              onClick={downloadInvoice}
              className="inline-flex items-center gap-1.5 text-sm text-gold-700 hover:text-gold-800 underline underline-offset-4 cursor-pointer"
            >
              <FilePdf size={16} /> GST invoice
            </button>
          )}
          <span className="text-xs px-3 py-1.5 rounded-full bg-gold-100 text-gold-800 font-medium">
            {order.status.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      {order.trackingNumber && (
        <p className="mt-3 text-sm text-ink-700">
          Tracking: <span className="font-medium">{order.trackingNumber}</span>
          {order.courierName ? ` via ${order.courierName}` : ""}
        </p>
      )}

      <section className="mt-8 bg-white rounded-2xl border border-ivory-200">
        <ul className="divide-y divide-ivory-200">
          {order.items.map((item) => (
            <li key={item.id} className="p-5 flex gap-4">
              {item.imageUrl && (
                <Image src={item.imageUrl} alt="" width={56} height={70} className="w-14 h-[70px] rounded-md object-cover bg-ivory-100" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-950">{item.name}</p>
                {item.variantTitle && <p className="text-xs text-ink-400">{item.variantTitle}</p>}
                <p className="text-xs text-ink-500 mt-1">
                  {item.quantity} × {formatINR(Number(item.unitPrice))}
                </p>
              </div>
              <p className="text-sm text-ink-950">{formatINR(Number(item.lineTotal))}</p>
            </li>
          ))}
        </ul>
        <div className="border-t border-ivory-200 p-5 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-ink-500">Taxable value</span><span>{formatINR(Number(order.subtotal))}</span></div>
          <div className="flex justify-between">
            <span className="text-ink-500">
              GST{Number(order.igstAmount) > 0 ? " (IGST)" : " (CGST + SGST)"}
            </span>
            <span>{formatINR(gst)}</span>
          </div>
          <div className="flex justify-between"><span className="text-ink-500">Shipping</span><span>{Number(order.shippingAmount) === 0 ? "Free" : formatINR(Number(order.shippingAmount))}</span></div>
          <div className="flex justify-between pt-2 border-t border-ivory-200 font-semibold text-base">
            <span>Total</span><span>{formatINR(Number(order.totalAmount))}</span>
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-ivory-200 p-5">
          <h2 className="text-sm font-semibold text-ink-950 mb-2">Delivering to</h2>
          <p className="text-sm text-ink-700 leading-relaxed">
            {order.shippingAddress.fullName}<br />
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? <><br />{order.shippingAddress.line2}</> : null}<br />
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}<br />
            {order.shippingAddress.phone}
          </p>
        </section>
        <section className="bg-white rounded-2xl border border-ivory-200 p-5">
          <h2 className="text-sm font-semibold text-ink-950 mb-3">Timeline</h2>
          <ol className="space-y-3">
            {order.statusHistory.map((h) => (
              <li key={h.id} className="flex gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-gold-600 mt-1.5 shrink-0" />
                <div>
                  <p className="text-ink-950">{h.toStatus.replaceAll("_", " ")}</p>
                  <p className="text-xs text-ink-400">{fmtDate(h.createdAt)}{h.note ? ` · ${h.note}` : ""}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <p className="mt-8 text-center">
        <Link href="/account/orders" className="text-sm text-gold-700 underline underline-offset-4">
          View all your orders
        </Link>
      </p>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense>
      <OrderView />
    </Suspense>
  );
}
