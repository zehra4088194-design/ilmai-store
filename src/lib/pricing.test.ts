import test from "node:test";
import assert from "node:assert/strict";
import { computeShippingMinor, formatMoney, manualPaymentTotalPkr, usdToPkr } from "./pricing";

// Non-notes items don't carry productSlug in real cart data either — computeShippingMinor treats
// it as "not one of ours" either way (see isNotesOrderSlug), so tests below omit it freely.

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
  assert.equal(computeShippingMinor([{ productType: "digital", quantity: 1, deliveryFeeMinor: 500 }]), 0);
});

test("computeShippingMinor: one parcel priced at the highest fee, never summed", () => {
  // This is the exact bug that shipped once: a checkout page summed
  // instead of took-the-max, silently undercharging on a multi-item order.
  const items = [
    { productType: "book", quantity: 1, deliveryFeeMinor: 200 },
    { productType: "physical", quantity: 1, deliveryFeeMinor: 500 },
    { productType: "digital", quantity: 1, deliveryFeeMinor: 999 }, // not shippable — must be ignored
  ];
  assert.equal(computeShippingMinor(items), 500);
});

test("computeShippingMinor: ilmai.study notes orders are priced off the quantity tiers, not their own (zero) fee", () => {
  const notesItem = (quantity: number) => ({ productType: "book", productSlug: "notes-abc123", quantity, deliveryFeeMinor: 0 });
  assert.equal(computeShippingMinor([notesItem(1)]), 15000); // PKR 150
  assert.equal(computeShippingMinor([notesItem(5)]), 15000); // still PKR 150 at the top of the first tier
  assert.equal(computeShippingMinor([notesItem(6)]), 30000); // PKR 300
  assert.equal(computeShippingMinor([notesItem(10)]), 30000);
  assert.equal(computeShippingMinor([notesItem(11)]), 50000); // PKR 500
  assert.equal(computeShippingMinor([notesItem(20)]), 50000);
  assert.equal(computeShippingMinor([notesItem(25)]), 50000); // beyond the schedule — stays at the top tier
});

test("computeShippingMinor: notes quantity is combined across separate cart lines (e.g. two different chapters)", () => {
  const items = [
    { productType: "book", productSlug: "notes-chapter-1", quantity: 3, deliveryFeeMinor: 0 },
    { productType: "book", productSlug: "notes-chapter-2", quantity: 4, deliveryFeeMinor: 0 },
  ];
  assert.equal(computeShippingMinor(items), 30000); // 3+4=7 copies -> PKR 300 tier, not PKR 150 twice
});

test("computeShippingMinor: a notes order alongside an ordinary physical product still takes the single highest fee", () => {
  const items = [
    { productType: "book", productSlug: "notes-abc123", quantity: 2, deliveryFeeMinor: 0 }, // tiers to PKR 150
    { productType: "physical", quantity: 1, deliveryFeeMinor: 40000 }, // PKR 400 flat
  ];
  assert.equal(computeShippingMinor(items), 40000);
});

test("manualPaymentTotalPkr: the JazzCash total must include shipping, not just subtotal", () => {
  // Regression for the bug where checkout/page.tsx computed the wallet
  // total from cart.subtotal alone, silently dropping the shipping fee the
  // order itself (and the JazzCash API route) actually charges.
  const subtotalMinor = 500000; // PKR 5,000
  const shippingMinor = computeShippingMinor([{ productType: "book", quantity: 1, deliveryFeeMinor: 20000 }]); // PKR 200
  const withShipping = manualPaymentTotalPkr(subtotalMinor + shippingMinor, "PKR", 280);
  const withoutShipping = manualPaymentTotalPkr(subtotalMinor, "PKR", 280);
  assert.ok(withShipping > withoutShipping, "including shipping must raise the total");
  assert.equal(withShipping - withoutShipping, 200);
});
