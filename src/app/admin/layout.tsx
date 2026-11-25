import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0B1D3A]">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/admin/shopkeepers" className="flex items-center gap-3 font-black">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0F766E] text-lg text-white">i</span>
            <span>IlmAI Pay <span className="text-xs font-bold text-[#64748B]">ADMIN</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/admin/shopkeepers" className="rounded-xl bg-[#E6F4F1] px-4 py-2 text-sm font-bold text-[#0F766E]">Merchants</Link>
            <form action="/auth/logout" method="post">
              <button className="rounded-xl border px-4 py-2 text-sm font-bold hover:bg-slate-50" type="submit">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
