import assert from "node:assert/strict";
import test from "node:test";
import { buildPayloadWithExpiry, generatePaymentPayload, getTodayExpiry, validateAmount, verifyCRC } from "./paymentQr";

test("matches the scanner-confirmed JazzCash payload", () => {
  const payload = buildPayloadWithExpiry(1109, "190820260832");

  assert.equal(
    payload,
    "0002020102120202000424PK53JCMA300392300108819405041109071219082026083210042F66",
  );
  assert.equal(verifyCRC(payload), true);
});

test("merchant identifier occupies the same canonical field and CRC covers it", () => {
  const payload = buildPayloadWithExpiry(150, "190820262359", "PK53JCMA3003923001234567");
  assert.ok(payload.includes("0424PK53JCMA3003923001234567"));
  assert.ok(payload.includes("0503150"));
  assert.equal(verifyCRC(payload), true);
});

test("whole-rupee amounts reject non-positive, decimal, malformed, and unsafe values", () => {
  for (const amount of ["0", "-1", "1.5", "1e3", " 100 ", "not-money", "Infinity", String(Number.MAX_SAFE_INTEGER + 1)]) {
    assert.throws(() => validateAmount(amount));
  }
  assert.equal(validateAmount("1250"), 1250);
});

test("amount changes produce distinct valid CRC payloads for the supplied JazzCash identity", () => {
  const merchant = "PK53JCMA3003923001234567";
  const reference = new Date("2026-08-19T19:00:00.000Z");
  const oneHundred = generatePaymentPayload(100, reference, merchant);
  const fiveHundred = generatePaymentPayload(500, reference, merchant);
  assert.notEqual(oneHundred, fiveHundred);
  assert.ok(oneHundred.includes("0503100"));
  assert.ok(fiveHundred.includes("0503500"));
  assert.equal(verifyCRC(oneHundred), true);
  assert.equal(verifyCRC(fiveHundred), true);
});

test("expiry follows Pakistan calendar date and ends at 23:59", () => {
  assert.equal(getTodayExpiry(new Date("2026-08-19T19:00:00.000Z")), "200820262359");
});
