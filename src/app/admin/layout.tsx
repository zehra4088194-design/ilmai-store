import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
const navigation = [["Overview", "/admin"], ["Products", "/admin/products"], ["Inventory", "/admin/inventory"], ["Orders", "/admin/orders"], ["Categories", "/admin/categories"], ["Promotions & banners", "/admin/promotions"], ["Reviews", "/admin/reviews"], ["Settings", "/admin/settings"]] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="min-h-screen bg-[#f3f6f1] text-[#103d42]"><aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-[#103d42] p-6 text-white lg:block"><Link href="/admin" className="flex items-center gap-3 text-lg font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f5bc50] text-[#103d42]">i</span> Store Admin</Link><nav className="mt-12 grid gap-2 text-sm">{navigation.map(([label, href]) => <Link className="rounded-xl px-4 py-3 hover:bg-white/10" href={href} key={href}>{label}</Link>)}</nav></aside><div className="lg:pl-64"><header className="border-b bg-white px-5 py-5 lg:px-10"><div className="flex items-center justify-between"><span className="font-semibold">Control centre</span><Link href="/" className="text-sm font-semibold text-[#14777a]">View store ↗</Link></div></header>{children}</div></div>;
}
