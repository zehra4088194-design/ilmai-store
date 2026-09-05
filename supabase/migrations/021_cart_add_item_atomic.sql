-- CartService.addItem used to read the existing cart_items.quantity, add
-- the requested amount in JS, then upsert the sum — a read-then-write race:
-- two near-simultaneous add-to-cart calls for the same variant can both
-- read the same starting quantity and one silently overwrites the other's
-- increment. Make the increment atomic with a single UPDATE/INSERT
-- statement inside one function call instead of round-tripping through the
-- app.
--
-- security invoker (the default) so this runs as whichever role called it
-- (authenticated for a signed-in customer's own client, service_role for
-- the admin client used on the guest-cart path) and stays subject to the
-- existing "cart_items_owner_all" RLS policy — a signed-in caller can only
-- ever touch a cart_items row under a cart they own, exactly as before.
create or replace function public.cart_add_item(
  p_cart_id uuid,
  p_variant_id uuid,
  p_quantity int,
  p_unit_price_minor int,
  p_max_quantity int default 99
) returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_new_quantity int;
begin
  insert into cart_items (cart_id, variant_id, quantity, unit_price_snapshot_minor)
  values (p_cart_id, p_variant_id, p_quantity, p_unit_price_minor)
  on conflict (cart_id, variant_id) do update
    set quantity = cart_items.quantity + excluded.quantity,
        unit_price_snapshot_minor = excluded.unit_price_snapshot_minor
  returning quantity into v_new_quantity;

  -- Exceeding the cap raises, which aborts this function's own effects
  -- (including the insert/update above) atomically — the row is left as it
  -- was before the call, not partially incremented.
  if v_new_quantity > p_max_quantity then
    raise exception 'Maximum quantity is %.', p_max_quantity using errcode = '23514';
  end if;

  return v_new_quantity;
end;
$$;

revoke execute on function public.cart_add_item(uuid, uuid, int, int, int) from public;
grant execute on function public.cart_add_item(uuid, uuid, int, int, int) to anon, authenticated;
