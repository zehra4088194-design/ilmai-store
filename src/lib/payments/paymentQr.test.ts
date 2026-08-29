import assert from "node:assert/strict";
import test from "node:test";
import { buildPayloadWithExpiry, verifyCRC } from "./paymentQr";

test("matches the scanner-confirmed JazzCash payload", () => {
  const payload = buildPayloadWithExpiry(1109, "190820260832");

  assert.equal(
    payload,
    "0002020102120202000424PK53JCMA300392300108819405041109071219082026083210042F66",
  );
  assert.equal(verifyCRC(payload), true);
});
