import assert from "node:assert/strict";
import test from "node:test";
import { shopkeeperAdminCreateSchema, shopkeeperAdminUpdateSchema } from "./shopkeeper";

const details = {
  email: "shop@example.com",
  jazzcashNumber: "03001234567",
  receivingIdentifierVerified: false,
};

test("admin provisions a shopkeeper by existing account email and JazzCash number", () => {
  assert.equal(shopkeeperAdminCreateSchema.safeParse(details).success, true);
  assert.equal(shopkeeperAdminCreateSchema.safeParse({ ...details, email: "not-an-email" }).success, false);
  assert.equal(shopkeeperAdminCreateSchema.safeParse({ ...details, jazzcashNumber: "abc" }).success, false);
});

test("active shopkeeper status requires an explicitly verified receiving identifier", () => {
  assert.equal(shopkeeperAdminUpdateSchema.safeParse({
    jazzcashNumber: details.jazzcashNumber, receivingIdentifier: "", receivingIdentifierVerified: false, status: "active",
  }).success, false);
  assert.equal(shopkeeperAdminUpdateSchema.safeParse({
    jazzcashNumber: details.jazzcashNumber, receivingIdentifier: "PK53JCMA3003923001234567", receivingIdentifierVerified: true, status: "active",
  }).success, true);
});
