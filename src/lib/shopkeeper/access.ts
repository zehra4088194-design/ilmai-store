import type { ShopkeeperStatus } from "@/constants/shopkeeper";

export type ShopkeeperQrAccess = {
  user_id: string;
  status: ShopkeeperStatus;
  receiving_identifier: string | null;
  receiving_identifier_verified: boolean;
};

export function canGenerateShopkeeperQr(account: ShopkeeperQrAccess | null, sessionUserId: string): boolean {
  return Boolean(
    account
    && account.user_id === sessionUserId
    && account.status === "active"
    && account.receiving_identifier_verified
    && account.receiving_identifier,
  );
}
