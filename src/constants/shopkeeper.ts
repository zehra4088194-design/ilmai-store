export const SHOPKEEPER_STATUSES = ["pending_verification", "active", "suspended"] as const;
export type ShopkeeperStatus = (typeof SHOPKEEPER_STATUSES)[number];
