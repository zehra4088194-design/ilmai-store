/**
 * Domain-level types — the shapes services and UI actually work with.
 * Mapped from `src/types/db.ts` Row types inside services, not used
 * interchangeably with them. Keeping these separate means a schema/column
 * rename doesn't ripple through every component.
 */

import type { ProductType } from "@/constants/product";
import type {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from "@/constants/order";
import type { PromotionPlacement } from "@/constants/promotion";

export interface Money {
  amountMinor: number;
  currency: string;
}

export interface ProductMedia {
  id: string;
  url: string; // resolved public/signed URL, never a raw storage key
  mediaType: "image" | "video" | "digital_file";
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  price: Money;
  isDefault: boolean;
  requiresShipping: boolean;
  weightGrams?: number;
  inStock?: boolean; // derived, not raw quantity, for public display
  providerPriceId?: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description?: string;
  productType: ProductType;
  status: "draft" | "published" | "archived";
  basePrice: Money;
  isFeatured: boolean;
  media: ProductMedia[];
  variants: ProductVariant[];
  categories: Category[];
}

export interface Address {
  id?: string;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface Customer {
  id: string;
  fullName?: string;
  phone?: string;
  email: string;
}

export interface CartItem {
  id: string;
  variantId: string;
  productId: string;
  productTitle: string;
  productType: ProductType;
  variantName: string;
  quantity: number;
  unitPrice: Money;
  providerPriceId?: string;
}

export interface Cart {
  id: string;
  userId?: string;
  items: CartItem[];
  subtotal: Money;
}

export interface OrderItem {
  id: string;
  productId?: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  productType: ProductType;
  sku?: string;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
  providerPriceId?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  items: OrderItem[];
  subtotal: Money;
  discount: Money;
  shipping: Money;
  tax: Money;
  total: Money;
  couponCode?: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  createdAt: string;
  guestAccessToken?: string;
  checkoutProviderId?: string;
  checkoutUrl?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  // Latest payment row's provider, if any — 'jazzcash' is the manual wallet
  // method (see ManualPaymentService); lets admin UI show a "Mark paid"
  // action only where it's actually meaningful (never for a 'paddle' order,
  // which resolves via its webhook).
  paymentProvider?: "paddle" | "jazzcash";
}

export interface Payment {
  id: string;
  orderId: string;
  provider: "paddle" | "jazzcash";
  providerTransactionId: string;
  status: PaymentStatus;
  amount: Money;
  paidAt?: string;
}

export interface DigitalEntitlement {
  id: string;
  userId: string;
  orderId: string;
  productId: string;
  downloadCount: number;
  maxDownloads?: number;
  expiresAt?: string;
}

export interface Promotion {
  id: string;
  name: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  startsAt: string;
  endsAt?: string;
  isActive: boolean;
}

export interface Coupon {
  code: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  minOrder: Money;
  isActive: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
  placement: PromotionPlacement;
  priority: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  body?: string;
  isVerifiedPurchase: boolean;
  moderationStatus: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface AdminUser {
  userId: string;
  role: "admin";
}
