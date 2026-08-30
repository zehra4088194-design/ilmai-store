-- Backs the ilmai.study <-> ilmai.store account handoff (src/app/auth/handoff/route.ts).
-- The two apps run on separate Supabase Auth projects; ilmai_study_user_id
-- (already a column on profiles since 001_initial_store_schema.sql) is the
-- cross-link key. A unique index prevents a race in the handoff route from
-- ever linking two store profiles to the same study account.
create unique index if not exists uq_profiles_ilmai_study_user_id
  on public.profiles (ilmai_study_user_id)
  where ilmai_study_user_id is not null;
