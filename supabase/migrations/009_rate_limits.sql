-- Small Postgres-backed fixed-window limiter. It avoids introducing Redis for
-- the single Next.js deployment while keeping sensitive routes bounded.

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count int not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_limit int,
  p_window_seconds int
)
returns table (allowed boolean, remaining int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket rate_limit_buckets%rowtype;
  next_reset timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate-limit configuration';
  end if;

  insert into rate_limit_buckets (bucket_key, window_started_at, request_count)
  values (p_bucket_key, now(), 0)
  on conflict (bucket_key) do nothing;

  select * into bucket from rate_limit_buckets
  where bucket_key = p_bucket_key for update;

  next_reset := bucket.window_started_at + make_interval(secs => p_window_seconds);
  if now() >= next_reset then
    update rate_limit_buckets
    set window_started_at = now(), request_count = 1, updated_at = now()
    where bucket_key = p_bucket_key;
    return query select true, p_limit - 1, now() + make_interval(secs => p_window_seconds);
    return;
  end if;

  if bucket.request_count >= p_limit then
    return query select false, 0, next_reset;
    return;
  end if;

  update rate_limit_buckets
  set request_count = request_count + 1, updated_at = now()
  where bucket_key = p_bucket_key;
  return query select true, p_limit - bucket.request_count - 1, next_reset;
end;
$$;

revoke all on public.rate_limit_buckets from public, anon, authenticated;
grant all on public.rate_limit_buckets to service_role;
revoke all on function public.consume_rate_limit(text, int, int) from public;
grant execute on function public.consume_rate_limit(text, int, int) to service_role;
