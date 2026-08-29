/** Must stay in sync with the `placement` CHECK constraints in the schema. */
export const PROMOTION_PLACEMENTS = [
  "store_home",
  "store_category",
  "ilmai_app_home",
  "ilmai_dashboard",
  "subject_page",
  "study_page",
] as const;

export type PromotionPlacement = (typeof PROMOTION_PLACEMENTS)[number];

export const DISCOUNT_TYPES = ["percentage", "fixed_amount"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];
