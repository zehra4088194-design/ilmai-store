export const SHOPKEEPER_QR_PRODUCT_SLUG = "jazzcash-dynamic-qr-for-shopkeepers";
export const SHOPKEEPER_STATUSES = ["pending_setup", "pending_verification", "active", "suspended", "revoked"] as const;
export type ShopkeeperStatus = (typeof SHOPKEEPER_STATUSES)[number];
