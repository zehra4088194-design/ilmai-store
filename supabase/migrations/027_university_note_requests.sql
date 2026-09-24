create table if not exists public.university_note_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  student_name text not null,
  email text not null,
  phone text,
  university text not null,
  campus text,
  city text,
  program text not null,
  department text,
  degree_level text,
  year_or_semester text not null,
  subject text not null,
  course_code text,
  exam_session text,
  language text,
  resource_types text[] not null default '{}',
  chapters_topics text,
  preferred_format text,
  needed_by date,
  additional_details text,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'fulfilled', 'cancelled')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_university_note_requests_status
  on public.university_note_requests(status);
create index if not exists idx_university_note_requests_created_at
  on public.university_note_requests(created_at desc);
create index if not exists idx_university_note_requests_university
  on public.university_note_requests(university);

drop trigger if exists trg_university_note_requests_updated_at on public.university_note_requests;
create trigger trg_university_note_requests_updated_at
before update on public.university_note_requests
for each row execute function set_updated_at();

alter table public.university_note_requests enable row level security;

drop policy if exists "university_note_requests_admin_select" on public.university_note_requests;
create policy "university_note_requests_admin_select"
on public.university_note_requests for select
using (is_admin());

drop policy if exists "university_note_requests_admin_update" on public.university_note_requests;
create policy "university_note_requests_admin_update"
on public.university_note_requests for update
using (is_admin())
with check (is_admin());
