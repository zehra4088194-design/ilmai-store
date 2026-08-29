import test from "node:test";
import assert from "node:assert/strict";
import { manualPaymentTotalPkr, usdToPkr } from "./pricing";

test("converts USD to whole PKR rupees", () => {
  assert.equal(usdToPkr(10, 280), 2800);
  assert.equal(manualPaymentTotalPkr(1000, "USD", 280), 2940);
  assert.equal(manualPaymentTotalPkr(125000, "PKR", 280), 1390);
});
