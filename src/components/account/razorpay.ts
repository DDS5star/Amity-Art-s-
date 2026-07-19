"use client";

import { storeJson } from "./auth";

/** Loads checkout.razorpay.com script once and opens the payment modal. */

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Could not load the payment window — check your connection"));
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export interface RazorpaySession {
  gatewayOrderId: string;
  keyId: string;
  amountPaise: number;
}

/**
 * Opens Razorpay checkout and resolves once OUR server has verified the
 * payment signature. Rejects on dismissal or verification failure.
 */
export async function payWithRazorpay(params: {
  session: RazorpaySession;
  orderId: string;
  orderNumber: string;
  customer: { name: string; email: string; phone?: string };
}): Promise<void> {
  await loadScript();
  if (!window.Razorpay) throw new Error("Payment window unavailable");

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: params.session.keyId,
      order_id: params.session.gatewayOrderId,
      amount: params.session.amountPaise,
      currency: "INR",
      name: "Amity Arts",
      description: `Order ${params.orderNumber}`,
      image: "/brand/logo.png",
      prefill: {
        name: params.customer.name,
        email: params.customer.email,
        contact: params.customer.phone,
      },
      theme: { color: "#8a5106" },
      modal: {
        ondismiss: () =>
          reject(new Error("Payment window closed — you can pay anytime from your order page")),
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          await storeJson("/api/payments/razorpay/verify", {
            method: "POST",
            body: JSON.stringify({
              orderId: params.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          resolve();
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Payment verification failed"));
        }
      },
    });
    rzp.open();
  });
}
