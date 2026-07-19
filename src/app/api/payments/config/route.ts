import { ok } from "@/lib/api";
import { razorpayConfigured, razorpayKeyId } from "@/server/adapters/razorpay";
import { getSetting } from "@/server/services/settings";

/** Which payment methods the storefront should offer. */
export async function GET() {
  const enabledInSettings = await getSetting("integrations.razorpay.enabled", true);
  const razorpay = razorpayConfigured() && enabledInSettings !== false;
  return ok({
    razorpay,
    razorpayKeyId: razorpay ? razorpayKeyId() : null,
    cod: await getSetting("checkout.codEnabled", true),
  });
}
