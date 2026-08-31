import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
const navigation = [["Overview", "/admin"], ["Products", "/admin/products"], ["Inventory", "/admin/inventory"], ["Orders", "/admin/orders"], ["Categories", "/admin/categories"], ["Promotions & banners", "/admin/promotions"], ["Reviews", "/admin/reviews"], ["Sellers", "/admin/sellers"], ["Settings", "/admin/settings"]] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="min-h-screen bg-[#F1F5F9] text-[#0B1D3A]"><aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-[#0B1D3A] p-6 text-white lg:block"><Link href="/admin" className="flex items-center gap-3 text-lg font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#2563EB] text-[#0B1D3A]">i</span> Store Admin</Link><nav className="mt-12 grid gap-2 text-sm">{navigation.map(([label, href]) => <Link className="rounded-xl px-4 py-3 hover:bg-white/10" href={href} key={href}>{label}</Link>)}</nav></aside><div className="lg:pl-64"><header className="border-b bg-white px-5 py-5 lg:px-10"><div className="flex items-center justify-between"><span className="font-semibold">Control centre</span><Link href="/" className="text-sm font-semibold text-[#2563EB]">View store ↗</Link></div></header>{children}</div></div>;
}
