import { z } from "zod";
import { GSTIN_REGEX } from "@/lib/gst";

const password = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a digit");

export const registerSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.toLowerCase()),
  password,
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  phone: z.string().regex(/^[6-9][0-9]{9}$/, "Invalid Indian mobile number").optional(),
  referralCode: z.string().max(40).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const wholesalerApplySchema = registerSchema.extend({
  companyName: z.string().min(1).max(200),
  gstin: z.string().regex(GSTIN_REGEX, "Invalid GSTIN").optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN").optional(),
  businessAddress: z
    .object({
      line1: z.string().min(1).max(200),
      line2: z.string().max(200).optional(),
      city: z.string().min(1).max(80),
      state: z.string().min(1).max(80),
      stateCode: z.string().regex(/^[0-9]{2}$/),
      pincode: z.string().regex(/^[1-9][0-9]{5}$/),
    })
    .optional(),
});
export type WholesalerApplyInput = z.infer<typeof wholesalerApplySchema>;

export const loginSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase()),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const wholesalerReviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "SUSPEND", "REACTIVATE"]),
  rejectionReason: z.string().max(500).optional(),
  creditLimit: z.number().nonnegative().optional(),
  creditDays: z.number().int().min(0).max(180).optional(),
});
export type WholesalerReviewInput = z.infer<typeof wholesalerReviewSchema>;

export const updateUserStatusSchema = z.object({
  action: z.enum(["SUSPEND", "ACTIVATE", "PROMOTE_MANAGER", "DEMOTE_MANAGER"]),
});
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
