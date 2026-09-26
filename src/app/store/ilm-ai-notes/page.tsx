import Link from "next/link";
import Image from "next/image";
import { BookOpen, FileText, Search, Sparkles, ClipboardList, ArrowRight } from "lucide-react";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { AddToBagButton } from "@/components/store/add-to-bag-button";
import { StudyBasketBar } from "@/components/store/study-basket-bar";
import { IlmaiNotesService } from "@/services/IlmaiNotesService";
import { formatMoney } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "IlmAI Study Notes | Search & Order Notes",
  description: "Explore and order available IlmAI study notes, chapter resources, MCQs, short questions, long questions and more from the official IlmAI Store.",
  alternates: { canonical: "/store/ilm-ai-notes" },
  robots: { index: false, follow: true },
};

type SearchParams = Promise<{ search?: string }> ;

function primaryImage(product: Awaited<ReturnType<typeof IlmaiNotesService.listPublic>>[number]) {
  return product.media.find((m) => m.isPrimary) ?? product.media[0];
}

function noteKind(title: string) {
  const lower = title.toLocaleLowerCase();
  if (lower.includes("mcq")) return "MCQs";
  if (lower.includes("short question")) return "Short Questions";
  if (lower.includes("long question")) return "Long Questions";
  if (lower.includes("past paper")) return "Past Papers";
  if (lower.includes("guess") || lower.includes("important")) return "Important Questions";
  if (lower.includes("chapter")) return "Chapter Resource";
  return "Study Note";
}

const QUICK_SEARCHES = ["MCQs", "Short Questions", "Long Questions", "Past Papers", "Important Questions"];

export default async function IlmAiNotesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const products = await IlmaiNotesService.listPublic(search || undefined);

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--navy)]">
      <StoreHeader initialSearch={search} />
      <main className="store-container py-8 pb-28 sm:py-12 sm:pb-32">
        <section className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-white shadow-[0_20px_70px_rgba(11,29,58,.06)]">
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.3fr_.7fr] lg:items-center">
            <div>
              <span className="eyebrow inline-flex items-center gap-2"><Sparkles size={14} /> IlmAI Notes</span>
              <h1 className="display-font mt-3 text-4xl sm:text-5xl">Build your study basket.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">Search and order an available generated note when you already know what you need. This direct-purchase shelf is intentionally kept out of search indexing and the public product discovery catalog; the main ilmai.study app is the normal entry point for generating and buying your own notes.</p>
              <form action="/store/ilm-ai-notes" method="GET" className="mt-7 flex overflow-hidden rounded-2xl border-2 border-[#0B1D3A]/10 bg-[#F8FAFC] focus-within:border-[#0F766E]">
                <div className="grid w-12 shrink-0 place-items-center text-[#64748B]"><Search size={18} /></div>
                <input name="search" defaultValue={search} placeholder="Search subject, chapter, MCQs, short questions..." className="min-w-0 flex-1 bg-transparent px-1 py-4 text-sm font-semibold outline-none" />
                <button type="submit" className="m-1 rounded-xl bg-[#0B1D3A] px-5 text-sm font-black text-white">Search</button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_SEARCHES.map((term) => (
                  <Link key={term} href={"/store/ilm-ai-notes?search=" + encodeURIComponent(term)} className="rounded-full border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-bold text-[var(--navy)] hover:border-[#0F766E] hover:text-[#0F766E]">
                    {term}
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] bg-[#0B1D3A] p-6 text-white sm:p-7">
              <div className="flex items-center gap-3"><ClipboardList size={20} className="text-[#D4AF37]" /><span className="text-xs font-black uppercase tracking-[.16em] text-[#B9C4E0]">University students</span></div>
              <h2 className="mt-4 text-2xl font-black">Can&apos;t find your university subject?</h2>
              <p className="mt-3 text-sm leading-6 text-[#B9C4E0]">Send the university, program, year/semester, subject and the exact resource types you need. Your request goes to the IlmAI Store team for fulfillment.</p>
              <Link href="/store/university-note-request" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#D4AF37] px-5 text-sm font-black text-[#0B1D3A]">Request university notes <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Available resources</span>
            <h2 className="section-title mt-2 !text-2xl sm:!text-3xl">{search ? `Results for “${search}”` : "Explore IlmAI Notes"}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{products.length} {products.length === 1 ? "resource" : "resources"} available to add to your basket.</p>
          </div>
          {search && <Link href="/store/ilm-ai-notes" className="secondary-cta">Clear search <ArrowRight size={14} /></Link>}
        </div>

        {products.length ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const image = primaryImage(product);
              const variant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
              const kind = noteKind(product.title);
              return (
                <article key={product.id} className="group overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <Link href={"/store/" + product.slug} className="relative block aspect-square overflow-hidden bg-[var(--gray)]">
                    {image ? <Image src={image.url} alt={image.altText ?? product.title} fill sizes="(min-width: 1280px) 22vw, (min-width: 640px) 30vw, 45vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" /> : <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#0B1D3A] to-[#0F766E] text-white"><BookOpen size={48} strokeWidth={1.2} className="opacity-50" /></div>}
                    <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#0B1D3A]">{kind}</span>
                  </Link>
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-[#0F766E]"><FileText size={12} /> IlmAI resource</div>
                    <Link href={"/store/" + product.slug}><h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-[var(--navy)] sm:text-base">{product.title}</h3></Link>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-[var(--navy)]">{formatMoney(variant?.price ?? product.basePrice)}</span>
                      <AddToBagButton variantId={variant?.id} label="Add to Basket" className="gold-btn h-9 px-3 text-[11px] sm:px-4" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state mt-6 rounded-3xl bg-white">
            <BookOpen size={32} className="mx-auto text-[#0F766E]" />
            <h2 className="mt-4 text-xl font-bold">{search ? "No matching notes found." : "No IlmAI Notes yet."}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{search ? "Try a subject, chapter, or resource type, or request the exact university notes you need." : "New resources will appear here as they become available."}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/store/university-note-request" className="gold-btn min-h-12 px-6">Request university notes</Link>
              {search && <Link href="/store/ilm-ai-notes" className="secondary-cta">Browse all notes</Link>}
            </div>
          </div>
        )}
      </main>
      <StudyBasketBar />
      <StoreFooter />
    </div>
  );
}
