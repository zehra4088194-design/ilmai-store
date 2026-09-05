import { ReturnRequestService } from "@/services/ReturnRequestService";
import { ReturnRequestActions } from "@/components/admin/ReturnRequestActions";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-[#FFF3E8] text-[#C2410C]",
  approved: "bg-[#DCFCE7] text-[#0F766E]",
  rejected: "bg-[#F1F5F9] text-[#64748B]",
  refunded: "bg-[#0B1D3A] text-white",
};

export default async function AdminReturnsPage() {
  const requests = await ReturnRequestService.adminList();
  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Customer service</p>
      <h1 className="display-font mt-2 text-5xl">Return &amp; refund requests</h1>
      <p className="mt-3 text-[#64748B]">Customers submit these from their order page. Approving doesn&apos;t move money by itself — use &quot;Mark refunded&quot; once you&apos;ve actually issued the refund through Safepay/JazzCash.</p>

      <div className="mt-8 grid gap-4">
        {requests.map((r) => (
          <div key={r.id} className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border bg-white p-6">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-bold">{r.orderNumber}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${STATUS_STYLE[r.status]}`}>{r.status}</span>
              </div>
              <p className="mt-1 text-sm text-[#64748B]">{r.customerEmail} · {new Date(r.createdAt).toLocaleDateString()}</p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#0B1D3A]">{r.reason}</p>
            </div>
            {r.status === "requested" && <ReturnRequestActions id={r.id} />}
          </div>
        ))}
        {!requests.length && <p className="rounded-3xl border bg-white p-10 text-center text-[#64748B]">No return requests yet.</p>}
      </div>
    </main>
  );
}
