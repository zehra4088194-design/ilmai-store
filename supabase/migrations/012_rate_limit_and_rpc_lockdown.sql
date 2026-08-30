-- Security-advisor follow-up after applying 001-011 to the live Supabase
-- project: rate_limit_buckets never got RLS enabled (its revoked grants
-- likely already blocked anon/authenticated, but RLS should be on
-- regardless — matches every other service-role-only table here), and
-- several operational RPCs (inventory/coupon reserve-commit-release,
-- consume_rate_limit) were still directly callable by anon/authenticated via
-- PostgREST — "revoke ... from public" in the migrations that created them
-- does not cover the anon/authenticated roles Supabase grants EXECUTE to by
-- default. None of these functions check caller identity internally (they
-- trust the app to only call them server-side via the service-role client),
-- so this closed a real anonymous order/coupon/inventory manipulation path.

alter table public.rate_limit_buckets enable row level security;

revoke execute on function public.reserve_order_inventory(uuid) from anon, authenticated;
revoke execute on function public.commit_order_inventory(uuid) from anon, authenticated;
revoke execute on function public.release_order_inventory(uuid) from anon, authenticated;
revoke execute on function public.refund_order_inventory(uuid) from anon, authenticated;
revoke execute on function public.release_expired_inventory_reservations() from anon, authenticated;
revoke execute on function public.reserve_coupon_for_order(uuid, text) from anon, authenticated;
revoke execute on function public.commit_coupon_for_order(uuid) from anon, authenticated;
revoke execute on function public.release_coupon_for_order(uuid) from anon, authenticated;
revoke execute on function public.release_expired_coupon_redemptions() from anon, authenticated;
revoke execute on function public.consume_rate_limit(text, int, int) from anon, authenticated;

-- Pins search_path on the two functions the advisor flagged as mutable
-- (defends against a schema-injection attack via a hijacked search_path).
alter function public.set_updated_at() set search_path = public;
alter function public.is_admin() set search_path = public;
