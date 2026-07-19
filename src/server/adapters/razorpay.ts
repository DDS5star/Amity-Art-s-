import { createHmac, timingSafeEqual } from "crypto";

/**
 * Razorpay adapter — REST API via fetch (no SDK dependency).
 * Free to set up for Indian businesses; fees are per-transaction only.
 * All functions no-op safely when keys are absent.
 */

const API = "https://api.razorpay.com/v1";

export const razorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID ?? "";

const authHeader = () =>
  "Basic " +
  Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");

/** Create a Razorpay order for an amount in INR. Returns the gateway order id. */
export async function createRazorpayOrder(params: {
  amountInr: number;
  receipt: string; // our order number
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(params.amountInr * 100), // paise
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes,
    }),
  });
  const body = (await res.json()) as
    | { id: string; amount: number; currency: string }
    | { error?: { description?: string } };
  if (!res.ok || !("id" in body)) {
    throw new Error(
      ("error" in body && body.error?.description) || `Razorpay order creation failed (${res.status})`,
    );
  }
  return body;
}

/** Checkout callback signature: HMAC-SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
  secret?: string; // injectable for tests
}): boolean {
  const secret = params.secret ?? process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
  } catch {
    return false; // length mismatch
  }
}

/** Webhook signature: HMAC-SHA256(rawBody, webhook_secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret?: string): boolean {
  const s = secret ?? process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!s) return false;
  const expected = createHmac("sha256", s).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
