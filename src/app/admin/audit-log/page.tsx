import { AuditLogService } from "@/services/AuditLogService";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";

export const dynamic = "force-dynamic";

const ACTION_STYLE: Record<string, string> = {
  delete: "bg-red-50 text-red-700",
  cancel: "bg-red-50 text-red-700",
  remove: "bg-red-50 text-red-700",
  reject: "bg-[#FFF3E8] text-[#C2410C]",
  refunded: "bg-[#0B1D3A] text-white",
};

function actionChipClass(action: string): string {
  const key = Object.keys(ACTION_STYLE).find((k) => action.includes(k));
  return (key ? ACTION_STYLE[key] : undefined) ?? "bg-[#F1F5F9] text-[#64748B]";
}

export default async function AdminAuditLogPage() {
  const entries = await AuditLogService.list(200);

  // Resolve actor emails for display — the log itself only stores the id,
  // same as every other admin table here (orders, reviews, ...).
  const uniqueActorIds = Array.from(new Set(entries.map((e) => e.actorId).filter((id): id is string => Boolean(id))));
  const admin = createSupabaseAdminClient();
  const emailById = new Map<string, string>();
  await Promise.all(uniqueActorIds.map(async (id) => {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) emailById.set(id, data.user.email);
  }));

  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Accountability</p>
      <h1 className="display-font mt-2 text-5xl">Audit log</h1>
      <p className="mt-3 text-[#64748B]">Who did what — order cancels/refunds, price and status changes, coupon/category deletes, seller status changes. Most recent first, last 200 entries.</p>

      <div className="mt-8 overflow-x-auto rounded-3xl border bg-white">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[160px_1fr_1fr_180px_140px] gap-4 border-b px-5 py-4 text-xs font-bold uppercase tracking-widest text-[#64748B]">
            <span>When</span><span>Action</span><span>Entity</span><span>Actor</span><span>Role</span>
          </div>
          {entries.map((e) => (
            <div key={e.id} className="grid grid-cols-[160px_1fr_1fr_180px_140px] items-center gap-4 border-b px-5 py-4 text-sm">
              <span className="text-[#64748B]">{new Date(e.createdAt).toLocaleString()}</span>
              <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${actionChipClass(e.action)}`}>{e.action}</span>
              <span className="truncate text-[#0B1D3A]">
                {e.entityType}
                {e.entityId ? <span className="ml-1 text-[#64748B]">#{e.entityId}</span> : null}
              </span>
              <span className="truncate text-[#64748B]">{e.actorId ? (emailById.get(e.actorId) ?? e.actorId) : "system"}</span>
              <span className="text-[#64748B]">{e.actorRole}</span>
            </div>
          ))}
          {!entries.length && <p className="p-10 text-center text-[#64748B]">No audit entries yet.</p>}
        </div>
      </div>
    </main>
  );
}
