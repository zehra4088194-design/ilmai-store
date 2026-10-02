import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, FileText, Search, ShoppingBasket } from "lucide-react";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { StudyNotesCatalogService, type StudyNoteCatalogEntry } from "@/services/StudyNotesCatalogService";
import { StudyNoteAddToBasket } from "@/components/study-notes/StudyNoteAddToBasket";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Study Notes | IlmAI Store",
  description: "Browse IlmAI study notes by academic level, grade, subject, book, chapter and resource type.",
  alternates: { canonical: "/store/ilm-ai-notes" },
};

type SearchParams = Promise<{
  search?: string;
  level?: "school" | "college";
  grade?: string;
  subject?: string;
  book?: string;
  chapter?: string;
  section?: "reading" | "numericals" | "mcq" | "short" | "long";
}>;

const SECTION_LABELS: Record<StudyNoteCatalogEntry["contentSection"], string> = {
  reading: "Chapter Reading",
  numericals: "Numericals",
  mcq: "MCQs",
  short: "Short Questions",
  long: "Long Questions",
};

function withParams(current: Record<string, string | undefined>, patch: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) if (value) next.set(key, value);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? \`/store/ilm-ai-notes?\${query}\` : "/store/ilm-ai-notes";
}

function distinct<T>(rows: StudyNoteCatalogEntry[], key: (row: StudyNoteCatalogEntry) => T | null | undefined) {
  return [...new Map(
    rows
      .map((row) => {
        const value = key(row);
        return value == null || value === "" ? null : [String(value), value];
      })
      .filter(Boolean) as [string, T][],
  ).values()];
}

function labelLevel(level: "school" | "college") {
  return level === "school" ? "School" : "College / Intermediate";
}

function resourceMatchesSearch(resource: StudyNoteCatalogEntry, search: string) {
  const haystack = [
    resource.resourceTitle,
    resource.subjectName,
    resource.bookTitle,
    resource.chapterName,
    resource.gradeLevel,
    resource.board,
    SECTION_LABELS[resource.contentSection],
  ].filter(Boolean).join(" ").toLocaleLowerCase();
  return haystack.includes(search.toLocaleLowerCase());
}

export default async function StudyNotesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = params.search?.trim() || "";
  const rows = await StudyNotesCatalogService.listAllForNavigation();
  const searchedRows = search ? rows.filter((row) => resourceMatchesSearch(row, search)) : rows;

  const current = {
    search: search || undefined,
    level: params.level || undefined,
    grade: params.grade || undefined,
    subject: params.subject || undefined,
    book: params.book || undefined,
    chapter: params.chapter || undefined,
    section: params.section || undefined,
  };

  let scoped = searchedRows;
  if (params.level) scoped = scoped.filter((row) => row.academicLevel === params.level);
  if (params.grade) scoped = scoped.filter((row) => row.gradeLevel === params.grade);
  if (params.subject) scoped = scoped.filter((row) => row.subjectSlug === params.subject);
  if (params.book) scoped = scoped.filter((row) => row.bookTitle === params.book);
  if (params.chapter) scoped = scoped.filter((row) => row.chapterSlug === params.chapter);
  if (params.section) scoped = scoped.filter((row) => row.contentSection === params.section);

  const depth = params.section ? 6 : params.chapter ? 5 : params.book ? 4 : params.subject ? 3 : params.grade ? 2 : params.level ? 1 : 0;

  const options = depth === 0
    ? distinct(searchedRows, (row) => row.academicLevel).map((level) => {
        const rowsForLevel = searchedRows.filter((row) => row.academicLevel === level);
        return {
          key: String(level),
          title: labelLevel(level as "school" | "college"),
          meta: \`\${new Set(rowsForLevel.map((row) => row.gradeLevel).filter(Boolean)).size} grades · \${rowsForLevel.length} notes\`,
          href: withParams(current, { level: String(level), grade: null, subject: null, book: null, chapter: null, section: null }),
        };
      })
    : depth === 1
      ? distinct(scoped, (row) => row.gradeLevel).map((grade) => {
          const rowsForGrade = scoped.filter((row) => row.gradeLevel === grade);
          return {
            key: String(grade),
            title: String(grade).replace("GRADE_", "Grade "),
            meta: \`\${new Set(rowsForGrade.map((row) => row.subjectSlug)).size} subjects · \${rowsForGrade.length} notes\`,
            href: withParams(current, { grade: String(grade), subject: null, book: null, chapter: null, section: null }),
          };
        })
      : depth === 2
        ? distinct(scoped, (row) => row.subjectSlug).map((subject) => {
            const subjectSlug = String(subject);
            const match = scoped.find((row) => row.subjectSlug === subjectSlug)!;
            const subjectRows = scoped.filter((row) => row.subjectSlug === subjectSlug);
            return {
              key: subjectSlug,
              title: match.subjectName,
              meta: \`\${new Set(subjectRows.map((row) => row.bookTitle)).size} books · \${subjectRows.length} notes\`,
              href: withParams(current, { subject: subjectSlug, book: null, chapter: null, section: null }),
            };
          })
        : depth === 3
          ? distinct(scoped, (row) => row.bookTitle).map((book) => {
              const bookTitle = String(book);
              const bookRows = scoped.filter((row) => row.bookTitle === bookTitle);
              return {
                key: bookTitle,
                title: bookTitle,
                meta: \`\${new Set(bookRows.map((row) => row.chapterSlug).filter(Boolean)).size} chapters · \${bookRows.length} notes\`,
                href: withParams(current, { book: bookTitle, chapter: null, section: null }),
              };
            })
          : depth === 4
            ? distinct(scoped, (row) => row.chapterSlug).map((chapter) => {
                const slug = String(chapter);
                const match = scoped.find((row) => row.chapterSlug === slug)!;
                const chapterRows = scoped.filter((row) => row.chapterSlug === slug);
                return {
                  key: slug,
                  title: match.chapterNumber ? \`Chapter \${match.chapterNumber}: \${match.chapterName}\` : (match.chapterName || "Chapter"),
                  meta: \`\${chapterRows.length} resources · \${new Set(chapterRows.map((row) => row.contentSection)).size} sections\`,
                  href: withParams(current, { chapter: slug, section: null }),
                };
              })
            : depth === 5
              ? distinct(scoped, (row) => row.contentSection).map((section) => {
                  const value = String(section) as StudyNoteCatalogEntry["contentSection"];
                  const sectionRows = scoped.filter((row) => row.contentSection === value);
                  return {
                    key: value,
                    title: SECTION_LABELS[value],
                    meta: \`\${sectionRows.length} resources\`,
                    href: withParams(current, { section: value }),
                  };
                })
              : [];

  const crumbs = [
    params.level && { label: labelLevel(params.level), href: withParams(current, { grade: null, subject: null, book: null, chapter: null, section: null }) },
    params.grade && { label: params.grade.replace("GRADE_", "Grade "), href: withParams(current, { subject: null, book: null, chapter: null, section: null }) },
    params.subject && { label: scoped.find((row) => row.subjectSlug === params.subject)?.subjectName || params.subject, href: withParams(current, { book: null, chapter: null, section: null }) },
    params.book && { label: params.book, href: withParams(current, { chapter: null, section: null }) },
    params.chapter && { label: scoped.find((row) => row.chapterSlug === params.chapter)?.chapterName || "Chapter", href: withParams(current, { section: null }) },
    params.section && { label: SECTION_LABELS[params.section], href: withParams(current, {}) },
  ].filter(Boolean) as { label: string; href: string }[];

  const showResources = depth === 6;
  const resources = showResources ? scoped.slice(0, 60) : [];

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--navy)]">
      <StoreHeader />
      <main className="store-container py-8 pb-28 sm:py-12 sm:pb-32">
        <section className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-white shadow-[0_20px_70px_rgba(11,29,58,.06)]">
          <div className="p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--muted)]">
              <Link href="/store" className="hover:text-[#0F766E]">Store</Link>
              <ChevronRight size={14} />
              <span className="text-[#0F766E]">Study Notes</span>
            </div>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="eyebrow inline-flex items-center gap-2"><BookOpen size={14} /> Academic study catalog</span>
                <h1 className="display-font mt-3 text-4xl sm:text-5xl">Find the exact notes you need.</h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                  Navigate the same academic structure as ilm AI Study: academic level → grade → subject → book → chapter → section. Products are created only when you choose to add a resource to your basket.
                </p>
              </div>
              <div className="rounded-2xl bg-[#0B1D3A] px-5 py-4 text-white">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-[#B9C4E0]"><ShoppingBasket size={15} /> One basket</div>
                <p className="mt-1 text-sm font-bold">Mix notes from different subjects, chapters and sections.</p>
              </div>
            </div>

            <form action="/store/ilm-ai-notes" method="GET" className="mt-7 flex overflow-hidden rounded-2xl border-2 border-[#0B1D3A]/10 bg-[#F8FAFC] focus-within:border-[#0F766E]">
              <div className="grid w-12 shrink-0 place-items-center text-[#64748B]"><Search size={18} /></div>
              <input name="search" defaultValue={search} placeholder="Search subject, book, chapter, MCQs, short questions..." className="min-w-0 flex-1 bg-transparent px-1 py-4 text-sm font-semibold outline-none" />
              <button type="submit" className="m-1 rounded-xl bg-[#0B1D3A] px-5 text-sm font-black text-white">Search</button>
            </form>
          </div>
        </section>

        {crumbs.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-bold">
            <Link href={withParams(current, { level: null, grade: null, subject: null, book: null, chapter: null, section: null })} className="text-[#0F766E]">Study Notes</Link>
            {crumbs.map((crumb) => (
              <span key={crumb.href} className="inline-flex items-center gap-2">
                <ChevronRight size={12} className="text-[#94A3B8]" />
                <Link href={crumb.href} className="rounded-full bg-white px-3 py-1.5 text-[var(--navy)] shadow-sm">{crumb.label}</Link>
              </span>
            ))}
          </div>
        )}

        {search && <div className="mt-7 rounded-2xl border border-[#0F766E]/20 bg-[#ECFDF5] px-4 py-3 text-sm font-semibold text-[#065F46]">{searchedRows.length} matching resources found for “{search}”.</div>}

        {!showResources ? (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Next step</span>
                <h2 className="section-title mt-2 !text-2xl sm:!text-3xl">
                  {depth === 0 ? "Choose an academic level" : depth === 1 ? "Choose a grade" : depth === 2 ? "Choose a subject" : depth === 3 ? "Choose a book" : depth === 4 ? "Choose a chapter" : "Choose a content section"}
                </h2>
              </div>
              <span className="text-xs font-bold text-[var(--muted)]">{scoped.length} resources in this path</span>
            </div>

            {options.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {options.map((option) => (
                  <Link key={option.key} href={option.href} className="group rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F766E]/10 text-[#0F766E]"><BookOpen size={22} /></span>
                      <ArrowRight size={17} className="text-[#94A3B8] transition group-hover:translate-x-1 group-hover:text-[#0F766E]" />
                    </div>
                    <h3 className="mt-5 line-clamp-2 text-lg font-black">{option.title}</h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">{option.meta}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-[var(--border)] bg-white p-10 text-center">
                <FileText size={30} className="mx-auto text-[#0F766E]" />
                <h2 className="mt-4 text-xl font-black">No resources match this path.</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">Try going back one step or search for another subject/chapter.</p>
                <Link href="/store/ilm-ai-notes" className="gold-btn mt-6 inline-flex min-h-11 px-5">Start again</Link>
              </div>
            )}
          </section>
        ) : (
          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Available resources</span>
                <h2 className="section-title mt-2 !text-2xl sm:!text-3xl">{SECTION_LABELS[params.section!]}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{scoped.length} resources in this section.</p>
              </div>
              <Link href={withParams(current, { section: null })} className="secondary-cta">Back to sections <ArrowLeft size={14} /></Link>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {resources.map((resource) => (
                <article key={resource.resourceId} className="rounded-3xl border border-[var(--border)] bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-[#0F766E]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#0F766E]">{SECTION_LABELS[resource.contentSection]}</span>
                    <span className="text-[11px] font-bold text-[var(--muted)]">{resource.pageCount ? \`\${resource.pageCount} pages\` : "Pages checked when added"}</span>
                  </div>
                  <p className="mt-4 text-xs font-black uppercase tracking-wide text-[var(--muted)]">{resource.subjectName}</p>
                  <h3 className="mt-1 line-clamp-2 text-base font-black">{resource.resourceTitle}</h3>
                  <p className="mt-2 line-clamp-1 text-xs font-semibold text-[#64748B]">{resource.chapterName || resource.bookTitle}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {resource.hasLightVersion && <span className="rounded-full border px-2 py-1 text-[10px] font-bold">Light theme</span>}
                    {resource.hasDarkVersion && <span className="rounded-full border px-2 py-1 text-[10px] font-bold">Dark theme</span>}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                    <Link href={\`/store/ilm-ai-notes/resource/\${resource.resourceId}\`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-3 text-xs font-black hover:border-[#0F766E] hover:text-[#0F766E]">View resource <ArrowRight size={14} /></Link>
                    <StudyNoteAddToBasket resourceId={resource.resourceId} hasLightVersion={resource.hasLightVersion} hasDarkVersion={resource.hasDarkVersion} compact />
                  </div>
                </article>
              ))}
            </div>
            {scoped.length > resources.length && <p className="mt-5 text-center text-xs font-semibold text-[var(--muted)]">Showing the first {resources.length} resources in this section.</p>}
          </section>
        )}
      </main>
      <StoreFooter />
    </div>
  );
}
