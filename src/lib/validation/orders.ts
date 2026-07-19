import { z } from "zod";

export const addressSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().regex(/^[6-9][0-9]{9}$/, "Invalid Indian mobile number"),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(80),
  state: z.string().min(1).max(80),
  stateCode: z.string().regex(/^[0-9]{2}$/),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Invalid pincode"),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const createOrderSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().cuid(),
        variantId: z.string().cuid().nullable().optional(),
        quantity: z.number().int().min(1).max(9999),
      }),
    )
    .min(1)
    .max(200),
  shippingAddress: addressSchema,
  paymentMethod: z.enum(["COD", "PAY_LATER", "RAZORPAY"]),
  customerNote: z.string().max(500).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
