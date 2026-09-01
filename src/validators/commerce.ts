import { z } from "zod";
import { PROMOTION_PLACEMENTS } from "@/constants/promotion";

export const addressSchema = z.object({
  label: z.string().max(60).optional(),
  fullName: z.string().min(1).max(120),
  phone: z.string().min(6).max(20),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2).default("PK"),
  isDefault: z.boolean().default(false),
});

export const addToCartSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export const updateCartItemSchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.number().int().min(0).max(99), // 0 = remove
});

export const checkoutSchema = z.object({
  cartId: z.string().uuid(),
  customerEmail: z.string().email(),
  // Always collected at checkout regardless of product type — a contact
  // number for order updates/support, separate from the full shipping
  // address (which is only required for physical/book items).
  customerPhone: z.string().trim().min(7).max(20).optional(),
  shippingAddress: addressSchema.optional(), // required only if cart has physical items
  billingAddress: addressSchema.optional(),
  couponCode: z.string().max(40).optional(),
  customerNote: z.string().max(1000).optional(),
  recaptchaToken: z.string().optional(),
});

export const manualPaymentProofSchema = z.object({
  transactionReference: z.string().trim().min(3).max(120),
  customerNote: z.string().trim().max(1000).optional(),
});

export const manualPaymentReviewSchema = z.object({
  reviewerNote: z.string().trim().max(1000).optional(),
});

export const fulfillmentUpdateSchema = z.object({
  fulfillmentStatus: z.enum(["unfulfilled", "partially_fulfilled", "fulfilled", "not_applicable"]),
  shippingCarrier: z.string().trim().max(80).optional(),
  trackingNumber: z.string().trim().max(160).optional(),
  delivered: z.boolean().default(false),
});

export const orderListQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const couponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, "code must be uppercase alphanumeric"),
  discountType: z.enum(["percentage", "fixed_amount"]),
  discountValue: z.number().int().positive(),
  maxRedemptions: z.number().int().positive().optional(),
  minOrderMinor: z.number().int().min(0).default(0),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

export const bannerSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(240).optional(),
  placement: z.enum(PROMOTION_PLACEMENTS),
  linkUrl: z.string().trim().max(500).optional(),
  priority: z.number().int().default(0),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  imageStorageKey: z.string().trim().max(500).optional(),
});

export const bannerUpdateSchema = bannerSchema.partial();

export const promotionSchema = z.object({
  name: z.string().trim().min(1).max(160),
  discountType: z.enum(["percentage", "fixed_amount"]),
  discountValue: z.number().int().positive(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

export const promotionUpdateSchema = promotionSchema.partial();

export const couponUpdateSchema = couponSchema.partial().omit({ code: true });

export const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(5000).optional(),
});

