import test from "node:test";
import assert from "node:assert/strict";
import { cardProcessingFeeMinor, computeShippingMinor, formatMoney, manualPaymentTotalPkr, usdToPkr } from "./pricing";

// Non-notes items don't carry productSlug in real cart data either — computeShippingMinor treats
// it as "not one of ours" either way (see isNotesOrderSlug), so tests below omit it freely.

test("converts USD to whole PKR rupees", () => {
  assert.equal(usdToPkr(10, 280), 2800);
  assert.equal(manualPaymentTotalPkr(1000, "USD", 280), 2800);
  assert.equal(manualPaymentTotalPkr(125000, "PKR", 280), 1250);
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

test("computeShippingMinor: Lahore IlmAI notes use 299/499/699 quantity tiers", () => {
  const notesItem = (quantity: number) => ({ productType: "book", productSlug: "notes-abc123", quantity, deliveryFeeMinor: 0 });
  assert.equal(computeShippingMinor([notesItem(1)], "Lahore"), 29900);
  assert.equal(computeShippingMinor([notesItem(5)], "Lahore"), 29900);
  assert.equal(computeShippingMinor([notesItem(6)], "Lahore"), 49900);
  assert.equal(computeShippingMinor([notesItem(10)], "Lahore"), 49900);
  assert.equal(computeShippingMinor([notesItem(11)], "Lahore"), 69900);
  assert.equal(computeShippingMinor([notesItem(50)], "Lahore"), 69900);
  assert.equal(computeShippingMinor([notesItem(1)], "Karachi"), 39900);
  assert.equal(computeShippingMinor([notesItem(6)], "Karachi"), 59900);
  assert.equal(computeShippingMinor([notesItem(11)], "Karachi"), 69900);
});

test("computeShippingMinor: notes quantity is combined across separate cart lines", () => {
  const items = [
    { productType: "book", productSlug: "notes-chapter-1", quantity: 3, deliveryFeeMinor: 0 },
    { productType: "book", productSlug: "notes-chapter-2", quantity: 4, deliveryFeeMinor: 0 },
  ];
  assert.equal(computeShippingMinor(items, "Lahore"), 49900); // 3+4=7 copies -> PKR 499 tier
});

test("computeShippingMinor: a notes order alongside an ordinary physical product still takes the single highest fee", () => {
  const items = [
    { productType: "book", productSlug: "notes-abc123", quantity: 2, deliveryFeeMinor: 0 },
    { productType: "physical", quantity: 1, deliveryFeeMinor: 40000 },
  ];
  assert.equal(computeShippingMinor(items, "Lahore"), 40000);
});

test("manualPaymentTotalPkr: JazzCash uses the exact order total without a processing surcharge", () => {
  // Regression for the bug where checkout/page.tsx computed the wallet
  // total from cart.subtotal alone, silently dropping the shipping fee the
  // order itself (and the JazzCash API route) actually charges.
  const subtotalMinor = 500000; // PKR 5,000
  const shippingMinor = computeShippingMinor([{ productType: "book", quantity: 1, deliveryFeeMinor: 20000 }]); // PKR 200
  const withShipping = manualPaymentTotalPkr(subtotalMinor + shippingMinor, "PKR", 280);
  const withoutShipping = manualPaymentTotalPkr(subtotalMinor, "PKR", 280);
  assert.equal(withShipping, 5200);
  assert.equal(withoutShipping, 5000);
  assert.equal(withShipping - withoutShipping, 200);
});

test("cardProcessingFeeMinor: fixed $0.50 is converted to PKR minor units", () => {
  assert.equal(cardProcessingFeeMinor("PKR", 280), 14000); // PKR 140
  assert.equal(cardProcessingFeeMinor("PKR", 277.5), 13875);
  assert.equal(cardProcessingFeeMinor("USD", 280), 0); // Safepay settles this store in PKR
});
