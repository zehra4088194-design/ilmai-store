-- coupons had no currency column at all — min_order_minor and a
-- 'fixed_amount' discount_value were raw minor-unit numbers with no
-- currency tag, so PromotionService.validateCoupon compared/subtracted
-- them against a cart's subtotal regardless of what currency that cart was
-- actually in (a coupon meant for PKR carts could be applied to a USD
-- cart, discounting or gating on the wrong order of magnitude). Every
-- coupon created so far was PKR-denominated in practice, so default
-- existing rows to 'PKR' — this is additive and changes no stored values.
alter table public.coupons add column if not exists currency text not null default 'PKR';
