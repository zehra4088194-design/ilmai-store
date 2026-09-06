import test from "node:test";
import assert from "node:assert/strict";
import { computeShippingMinor, formatMoney, manualPaymentTotalPkr, usdToPkr } from "./pricing";

test("converts USD to whole PKR rupees", () => {
  assert.equal(usdToPkr(10, 280), 2800);
  assert.equal(manualPaymentTotalPkr(1000, "USD", 280), 2940);
  assert.equal(manualPaymentTotalPkr(125000, "PKR", 280), 1390);
});

test("formatMoney renders USD with a $ sign and everything else as CODE amount", () => {
  assert.equal(formatMoney({ amountMinor: 150000, currency: "USD" }), "$1,500");
  assert.equal(formatMoney({ amountMinor: 150000, currency: "PKR" }), "PKR 1,500");
  // Currency code casing shouldn't change which branch renders.
  assert.equal(formatMoney({ amountMinor: 500, currency: "usd" }), "$5");
});

test("computeShippingMinor: no shippable items means free (0)", () => {
  assert.equal(computeShippingMinor([]), 0);
  assert.equal(computeShippingMinor([{ productType: "digital", deliveryFeeMinor: 500 }]), 0);
});

test("computeShippingMinor: one parcel priced at the highest fee, never summed", () => {
  // This is the exact bug that shipped once: a checkout page summed
  // instead of took-the-max, silently undercharging on a multi-item order.
  const items = [
    { productType: "book", deliveryFeeMinor: 200 },
    { productType: "physical", deliveryFeeMinor: 500 },
    { productType: "digital", deliveryFeeMinor: 999 }, // not shippable — must be ignored
  ];
  assert.equal(computeShippingMinor(items), 500);
});

test("manualPaymentTotalPkr: the JazzCash total must include shipping, not just subtotal", () => {
  // Regression for the bug where checkout/page.tsx computed the wallet
  // total from cart.subtotal alone, silently dropping the shipping fee the
  // order itself (and the JazzCash API route) actually charges.
  const subtotalMinor = 500000; // PKR 5,000
  const shippingMinor = computeShippingMinor([{ productType: "book", deliveryFeeMinor: 20000 }]); // PKR 200
  const withShipping = manualPaymentTotalPkr(subtotalMinor + shippingMinor, "PKR", 280);
  const withoutShipping = manualPaymentTotalPkr(subtotalMinor, "PKR", 280);
  assert.ok(withShipping > withoutShipping, "including shipping must raise the total");
  assert.equal(withShipping - withoutShipping, 200);
});
