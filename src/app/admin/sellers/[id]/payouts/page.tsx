import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SellerService } from "@/services/SellerService";
import { SellerPayoutService } from "@/services/SellerPayoutService";
import { SellerPayoutPanel } from "@/components/admin/SellerPayoutPanel";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SellerPayoutsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seller = await SellerService.getOwnProfile(id).catch(() => null);
  if (!seller) notFound();

  const [summary, payouts] = await Promise.all([
    SellerPayoutService.getEarningsSummary(id),
    SellerPayoutService.adminListPayouts(id),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6 lg:p-10">
      <Link href="/admin/sellers" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0F766E]"><ArrowLeft size={15} /> Back to sellers</Link>
      <p className="mt-4 text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Payouts</p>
      <h1 className="display-font mt-2 text-4xl">{seller.businessName ?? seller.email ?? "Seller"}</h1>
      <p className="mt-2 text-sm text-[#64748B]">
        Revenue is summed from this seller&apos;s paid order items. Recording a payout here is bookkeeping only — it doesn&apos;t move money; send the actual transfer separately (bank/JazzCash), then record it.
      </p>

      <SellerPayoutPanel sellerId={id} commissionRateBps={seller.commissionRateBps} summary={summary} payouts={payouts} />
    </main>
  );
}
