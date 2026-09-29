import assert from "node:assert/strict";
import test from "node:test";
import { shopkeeperAdminUpdateSchema, shopkeeperProfileSchema } from "./shopkeeper";

const details = {
  businessName: "Example Shop",
  jazzcashNumber: "03001234567",
  jazzcashAccountName: "Example Holder",
};

test("shopkeeper identity requires plausible account details and a distinct provider identifier", () => {
  assert.equal(shopkeeperProfileSchema.safeParse(details).success, true);
  assert.equal(shopkeeperProfileSchema.safeParse({ ...details, jazzcashNumber: "abc" }).success, false);
  assert.equal(shopkeeperAdminUpdateSchema.safeParse({
    ...details, receivingIdentifier: "", receivingIdentifierVerified: false, status: "active",
  }).success, false);
  assert.equal(shopkeeperAdminUpdateSchema.safeParse({
    ...details, receivingIdentifier: "PK53JCMA3003923001234567", receivingIdentifierVerified: true, status: "active",
  }).success, true);
});
