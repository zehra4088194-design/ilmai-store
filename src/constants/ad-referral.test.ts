import test from "node:test";
import assert from "node:assert/strict";
import { AD_REFERRAL_MAX_LENGTH, normalizeAdReferral } from "./ad-referral";

test("normalizes referral IDs without replacing them with empty values", () => {
  assert.equal(normalizeAdReferral("  click-123  "), "click-123");
  assert.equal(normalizeAdReferral("   "), undefined);
  assert.equal(normalizeAdReferral("x".repeat(AD_REFERRAL_MAX_LENGTH + 1)), undefined);
});
