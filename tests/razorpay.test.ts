import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/server/adapters/razorpay";

const SECRET = "test_secret_do_not_use";

describe("verifyPaymentSignature", () => {
  const orderId = "order_MkX1a2b3c4d5e6";
  const paymentId = "pay_NlY7f8g9h0i1j2";
  const valid = createHmac("sha256", SECRET).update(`${orderId}|${paymentId}`).digest("hex");

  it("accepts the correct HMAC", () => {
    expect(
      verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature: valid,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("rejects a tampered signature", () => {
    expect(
      verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature: valid.replace(/.$/, valid.endsWith("0") ? "1" : "0"),
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects a signature for a different payment", () => {
    expect(
      verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: "pay_SOMEOTHER",
        signature: valid,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejects when no secret is configured", () => {
    expect(
      verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature: valid,
        secret: "",
      }),
    ).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: {} });
  const valid = createHmac("sha256", SECRET).update(body).digest("hex");

  it("accepts the correct webhook HMAC", () => {
    expect(verifyWebhookSignature(body, valid, SECRET)).toBe(true);
  });

  it("rejects a modified body", () => {
    expect(verifyWebhookSignature(body + " ", valid, SECRET)).toBe(false);
  });
});
