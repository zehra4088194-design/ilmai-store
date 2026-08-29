import { ReviewService } from "@/services/ReviewService";
import { ReviewModerationButton } from "@/components/admin/ReviewModerationButton";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const reviews = await ReviewService.adminList();
  return <main className="mx-auto max-w-6xl p-6 lg:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Trust and safety</p><h1 className="display-font mt-2 text-5xl">Reviews</h1><div className="mt-8 grid gap-4">{reviews.map((review) => <article key={review.id} className="rounded-3xl border bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{review.title || "Untitled review"}</p><p className="mt-1 text-sm text-[#668084]">{review.rating}/5 · {review.isVerifiedPurchase ? "Verified purchase" : "Unverified"}</p></div><div className="flex gap-2"><ReviewModerationButton reviewId={review.id} status="approved" /><ReviewModerationButton reviewId={review.id} status="rejected" /></div></div><p className="mt-4 text-sm leading-6 text-[#486267]">{review.body || "No written comment."}</p><p className="mt-4 text-xs uppercase tracking-widest text-[#789094]">{review.moderationStatus}</p></article>)}{!reviews.length && <p className="rounded-2xl border bg-white p-8 text-center text-[#668084]">No reviews yet.</p>}</div></main>;
}
