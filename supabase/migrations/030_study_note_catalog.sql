-- Study Notes catalog mirror.
-- Source of truth remains ilmai.study's library_resources; this table stores
-- only navigation/commerce metadata needed by ilmai.store's explorer.
create table if not exists public.study_note_catalog (
  resource_id uuid primary key,
  academic_level text not null check (academic_level in ('school', 'college')),
  board text,
  grade_level text,
  subject_id uuid,
  subject_name text not null,
  subject_slug text not null,
  book_title text not null,
  chapter_id uuid,
  chapter_number integer,
  chapter_name text,
  chapter_slug text,
  content_section text not null check (content_section in ('reading', 'numericals', 'mcq', 'short', 'long')),
  section_order smallint not null default 99,
  resource_type text not null default 'notes' check (resource_type = 'notes'),
  resource_title text not null,
  resource_display_order integer not null default 0,
  page_count integer check (page_count is null or page_count > 0),
  has_light_version boolean not null default false,
  has_dark_version boolean not null default false,
  is_available boolean not null default true,
  product_id uuid references public.products(id) on delete set null,
  product_slug text,
  source_created_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_study_note_catalog_level
  on public.study_note_catalog (academic_level, grade_level);
create index if not exists idx_study_note_catalog_subject
  on public.study_note_catalog (subject_slug, subject_name);
create index if not exists idx_study_note_catalog_book
  on public.study_note_catalog (book_title);
create index if not exists idx_study_note_catalog_chapter
  on public.study_note_catalog (chapter_slug, chapter_number);
create index if not exists idx_study_note_catalog_section
  on public.study_note_catalog (content_section, section_order);
create index if not exists idx_study_note_catalog_available
  on public.study_note_catalog (is_available);

drop trigger if exists trg_study_note_catalog_updated_at on public.study_note_catalog;
create trigger trg_study_note_catalog_updated_at
before update on public.study_note_catalog
for each row execute function set_updated_at();

alter table public.study_note_catalog enable row level security;

drop policy if exists "study_note_catalog_public_read" on public.study_note_catalog;
create policy "study_note_catalog_public_read"
on public.study_note_catalog
for select
to anon, authenticated
using (is_available = true);

comment on table public.study_note_catalog is
  'Store-side navigation mirror of printable ilmai.study library notes. Source of truth is ilmai.study; no educational note content is copied here.';
