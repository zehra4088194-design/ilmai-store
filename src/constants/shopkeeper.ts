export const SHOPKEEPER_STATUSES = ["pending_verification", "active", "suspended"] as const;
export type ShopkeeperStatus = (typeof SHOPKEEPER_STATUSES)[number];

// Canonical product slug retained for the existing standalone checkout path.
// Shopkeeper access itself is still provisioned/admin-verified separately.
export const SHOPKEEPER_QR_PRODUCT_SLUG = "jazzcash-dynamic-qr-for-shopkeepers";
