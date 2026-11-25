-- Add a customer-facing shop name to each merchant and retain existing rows.
alter table public.shopkeepers
  add column if not exists display_name text;

update public.shopkeepers
set display_name = 'Merchant'
where display_name is null or length(btrim(display_name)) = 0;

alter table public.shopkeepers
  alter column display_name set default 'Merchant',
  alter column display_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.shopkeepers'::regclass
      and conname = 'shopkeepers_display_name_length_check'
  ) then
    alter table public.shopkeepers
      add constraint shopkeepers_display_name_length_check
      check (length(btrim(display_name)) between 2 and 120);
  end if;
end $$;
