import { z } from "zod";

/** Known settings get strict validation; unknown keys are rejected. */
const KNOWN_SETTINGS: Record<string, z.ZodTypeAny> = {
  "warehouse.pincode": z.string().regex(/^[1-9][0-9]{5}$/, "Invalid Indian pincode"),
  "warehouse.stateCode": z.string().regex(/^[0-9]{2}$/),
  "warehouse.city": z.string().min(1).max(80),
  "shipping.defaultZoneName": z.string().min(1).max(80),
  "shipping.outOfStockLeadDays": z.number().int().min(0).max(60),
  "gst.defaultRatePercent": z.number().min(0).max(100),
  "gst.sellerGstin": z.string().regex(/^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Invalid GSTIN"),
  "gst.defaultHsnCode": z.string().max(10),
  "store.name": z.string().min(1).max(120),
  "store.currency": z.literal("INR"),
  "store.whatsappNumber": z.string().regex(/^$|^91[0-9]{10}$/, "Use 91 followed by the 10-digit number"),
  "integrations.whatsapp.enabled": z.boolean(),
  "integrations.razorpay.enabled": z.boolean(),
  "integrations.stripe.enabled": z.boolean(),
  "checkout.codEnabled": z.boolean(),
  "loyalty.pointsPerRupee": z.number().min(0).max(1),
};

export const updateSettingSchema = z
  .object({
    key: z.string().min(1).max(120),
    value: z.unknown(),
    group: z.string().min(1).max(40).default("general"),
  })
  .superRefine((data, ctx) => {
    const validator = KNOWN_SETTINGS[data.key];
    if (!validator) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["key"], message: `Unknown setting key "${data.key}"` });
      return;
    }
    const result = validator.safeParse(data.value);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: result.error.issues[0]?.message ?? "Invalid value for this setting",
      });
    }
  });

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
