import assert from "node:assert/strict";
import test from "node:test";
import { canGenerateShopkeeperQr } from "./access";

const activeShopkeeper = {
  user_id: "user-a",
  orderPaid: true,
  status: "active" as const,
  receiving_identifier: "PK53JCMA3003923001234567",
  receiving_identifier_verified: true,
};

test("QR access requires the session owner, a paid entitlement, and verified active receiving identity", () => {
  assert.equal(canGenerateShopkeeperQr(activeShopkeeper, "user-a"), true);
  assert.equal(canGenerateShopkeeperQr(activeShopkeeper, "user-b"), false);
  assert.equal(canGenerateShopkeeperQr({ ...activeShopkeeper, orderPaid: false }, "user-a"), false);
  assert.equal(canGenerateShopkeeperQr({ ...activeShopkeeper, status: "suspended" }, "user-a"), false);
  assert.equal(canGenerateShopkeeperQr({ ...activeShopkeeper, receiving_identifier_verified: false }, "user-a"), false);
  assert.equal(canGenerateShopkeeperQr({ ...activeShopkeeper, receiving_identifier: null }, "user-a"), false);
});
