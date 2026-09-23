import Link from "next/link";
import Image from "next/image";
import { BookOpen, FileText, Sparkles } from "lucide-react";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { AddToBagButton } from "@/components/store/add-to-bag-button";
import { IlmaiNotesService } from "@/services/IlmaiNotesService";
import { formatMoney } from "@/lib/pricing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "IlmAI Generated Study Notes | Direct Purchase",
  description: "Direct-purchase printed study-note products created through ilmai.study and fulfilled through the official IlmAI Store.",
  alternates: { canonical: "/store/ilm-ai-notes" },
  robots: { index: false, follow: true },
};

function primaryImage(product: Awaited<ReturnType<typeof IlmaiNotesService.listPublic>>[number]) {
  return product.media.find((m) => m.isPrimary) ?? product.media[0];
}

export default async function IlmaiNotesPage() {
  const [products, { data: { user } }] = await Promise.all([
    IlmaiNotesService.listPublic(),
    (await createSupabaseServerClient()).auth.getUser(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--navy)]">
      <StoreHeader />
      <main className="store-container py-10 sm:py-14">
        <div className="mb-10 rounded-3xl border border-[var(--border)] bg-white p-6 sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow inline-flex items-center gap-2"><Sparkles size={14} /> IlmAI Notes</span>
              <h1 className="display-font mt-2 text-4xl sm:text-5xl">Your generated study notes.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Notes created from ilmai.study appear here automatically for direct purchase. These generated links stay outside the public store search and product sitemap; the student reaches the relevant copy from the study app.
              </p>
            </div>
            <Link href="/store" className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-bold text-[var(--navy)]">
              Back to store
            </Link>
          </div>
        </div>

        {products.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const image = primaryImage(product);
              const variant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
              return (
                <article key={product.id} className="product-card-grid overflow-hidden rounded-3xl bg-white">
                  <Link href={`/store/${product.slug}`} className="relative block aspect-square overflow-hidden bg-[var(--gray)]">
                    {image ? (
                      <Image src={image.url} alt={image.altText ?? product.title} fill sizes="(min-width: 1280px) 22vw, (min-width: 640px) 30vw, 45vw" className="object-cover transition duration-500 hover:scale-[1.04]" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#0B1D3A] to-[#0F766E] text-white">
                        <BookOpen size={48} strokeWidth={1.2} className="opacity-50" />
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#0B1D3A]">
                      IlmAI Note
                    </span>
                  </Link>
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-[#0F766E]"><FileText size={12} /> Generated note</div>
                    <Link href={`/store/${product.slug}`}>
                      <h2 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-[var(--navy)] sm:text-base">{product.title}</h2>
                    </Link>
                    <p className="mt-1 text-xs text-[var(--muted)]">Choose your available note version at checkout.</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-[var(--navy)]">{formatMoney(variant?.price ?? product.basePrice)}</span>
                      <AddToBagButton variantId={variant?.id} label="Add" className="gold-btn h-9 px-4 text-[11px]" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state rounded-3xl bg-white">
            <BookOpen size={32} className="mx-auto text-[#0F766E]" />
            <h2 className="mt-4 text-xl font-bold">No IlmAI Notes yet.</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">As notes are generated on ilmai.study, they will appear here automatically.</p>
            <Link href="/store" className="gold-btn mt-6 min-h-12 px-6">Browse store</Link>
          </div>
        )}
      </main>
      <StoreFooter />
      <span className="sr-only">{user ? "Signed in" : "Guest"}</span>
    </div>
  );
}
