import Link from "next/link";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import type { Product } from "@/types/domain";
import { formatMoney } from "@/lib/pricing";

function primaryImage(product: Product) {
  return product.media.find((m) => m.isPrimary) ?? product.media[0];
}

function priceOf(product: Product) {
  return (product.variants.find((v) => v.isDefault) ?? product.variants[0])?.price ?? product.basePrice;
}

/** "You may also like" strip on the product page — same category, current product excluded. */
export function RelatedProducts({ products }: { products: Product[] }) {
  return (
    <div className="mt-8 rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[.12em] text-[var(--muted)]">You may also like</p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.map((product) => {
          const image = primaryImage(product);
          return (
            <Link key={product.id} href={`/store/${product.slug}`} className="group block">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--gray)]">
                {image ? (
                  <Image src={image.url} alt={image.altText ?? product.title} fill sizes="(min-width: 640px) 22vw, 45vw" className="object-cover transition duration-500 group-hover:scale-[1.05]" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[var(--chrome)] to-[#302758]">
                    <BookOpen size={32} strokeWidth={1} className="text-white/30" />
                  </div>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-[var(--foreground)]">{product.title}</p>
              <p className="mt-1 text-xs font-bold text-[var(--brand-primary)]">{formatMoney(priceOf(product))}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
