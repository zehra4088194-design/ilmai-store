import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, Printer, ShoppingBasket } from "lucide-react";
import { notFound } from "next/navigation";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { StudyNotesCatalogService } from "@/services/StudyNotesCatalogService";
import { StudyNoteAddToBasket } from "@/components/study-notes/StudyNoteAddToBasket";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Study Note | IlmAI Store",
  robots: { index: true, follow: true },
};

type Params = Promise<{ resourceId: string }>;

const SECTION_LABELS = {
  reading: "Chapter Reading",
  numericals: "Numericals",
  mcq: "MCQs",
  short: "Short Questions",
  long: "Long Questions",
} as const;

export default async function StudyNoteResourcePage({ params }: { params: Params }) {
  const { resourceId } = await params;
  const resource = await StudyNotesCatalogService.getByResourceId(resourceId);
  if (!resource) notFound();

  const pathBits = [
    { label: "Study Notes", href: "/store/ilm-ai-notes" },
    { label: resource.academicLevel === "school" ? "School" : "College / Intermediate", href: `/store/ilm-ai-notes?level=${encodeURIComponent(resource.academicLevel)}` },
    resource.gradeLevel && { label: resource.gradeLevel.replace("GRADE_", "Grade "), href: `/store/ilm-ai-notes?level=${encodeURIComponent(resource.academicLevel)}&grade=${encodeURIComponent(resource.gradeLevel)}` },
    { label: resource.subjectName, href: `/store/ilm-ai-notes?level=${encodeURIComponent(resource.academicLevel)}&grade=${encodeURIComponent(resource.gradeLevel || "")}&subject=${encodeURIComponent(resource.subjectSlug)}` },
    { label: resource.bookTitle, href: `/store/ilm-ai-notes?level=${encodeURIComponent(resource.academicLevel)}&grade=${encodeURIComponent(resource.gradeLevel || "")}&subject=${encodeURIComponent(resource.subjectSlug)}&book=${encodeURIComponent(resource.bookTitle)}` },
    resource.chapterSlug && { label: resource.chapterName || "Chapter", href: `/store/ilm-ai-notes?level=${encodeURIComponent(resource.academicLevel)}&grade=${encodeURIComponent(resource.gradeLevel || "")}&subject=${encodeURIComponent(resource.subjectSlug)}&book=${encodeURIComponent(resource.bookTitle)}&chapter=${encodeURIComponent(resource.chapterSlug)}` },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <StoreHeader />
      <main className="store-container py-8 pb-28 sm:py-12 sm:pb-32">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--muted)]">
          {pathBits.map((bit, index) => (
            <span key={bit.href} className="inline-flex items-center gap-2">
              {index > 0 && <ChevronRight size={12} />}
              <Link href={bit.href} className={index === pathBits.length - 1 ? "text-[var(--brand-primary)]" : "hover:text-[var(--brand-primary)]"}>{bit.label}</Link>
            </span>
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[0_20px_70px_rgba(52,38,84,.10)]">
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <span className="eyebrow inline-flex items-center gap-2"><Printer size={14} /> Printed IlmAI Study Note</span>
              <p className="mt-4 text-xs font-black uppercase tracking-[.15em] text-[var(--brand-primary)]">{resource.subjectName} · {resource.gradeLevel?.replace("GRADE_", "Grade ")}</p>
              <h1 className="display-font mt-2 text-4xl leading-tight sm:text-5xl">{resource.resourceTitle}</h1>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
                {resource.chapterName || resource.bookTitle}. {SECTION_LABELS[resource.contentSection]} resource from the ilm AI Study library, prepared as a printed copy for delivery in Pakistan.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-[rgba(124,58,237,.10)] px-3 py-1.5 text-xs font-black text-[var(--brand-primary)]">{SECTION_LABELS[resource.contentSection]}</span>
                {resource.pageCount && <span className="rounded-full border px-3 py-1.5 text-xs font-bold">{resource.pageCount} pages</span>}
                {resource.hasLightVersion && <span className="rounded-full border px-3 py-1.5 text-xs font-bold">Light theme</span>}
                {resource.hasDarkVersion && <span className="rounded-full border px-3 py-1.5 text-xs font-bold">Dark theme</span>}
              </div>
            </div>

            <div className="rounded-[28px] bg-[var(--chrome)] p-6 text-white sm:p-8">
              <div className="flex items-center gap-3"><ShoppingBasket size={22} className="text-[var(--commerce)]" /><span className="text-xs font-black uppercase tracking-[.15em] text-[var(--chrome-muted)]">Add to your basket</span></div>
              <h2 className="mt-4 text-2xl font-black">Choose your print theme</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--chrome-muted)]">The final print price is resolved from the current ilm AI print settings when you add it. The same resource maps to one canonical Store product, with Light and Dark as variants.</p>
              <div className="mt-6"><StudyNoteAddToBasket resourceId={resource.resourceId} hasLightVersion={resource.hasLightVersion} hasDarkVersion={resource.hasDarkVersion} /></div>
              <Link href="/store/cart" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[var(--commerce)] hover:underline">Open basket <ArrowRight size={13} /></Link>
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/store/ilm-ai-notes" className="secondary-cta"><ArrowLeft size={14} /> Back to Study Notes</Link>
          <span className="text-xs font-semibold text-[var(--muted)]">Products are materialized only when needed.</span>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
