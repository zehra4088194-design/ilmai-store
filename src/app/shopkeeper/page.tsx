import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ShopkeeperService } from "@/services/ShopkeeperService";
import { ShopkeeperPortal } from "@/components/shopkeeper/shopkeeper-portal";

export const dynamic = "force-dynamic";

export default async function ShopkeeperPage() {
  const { data: { user } } = await (await createSupabaseServerClient()).auth.getUser();
  if (!user) {
    return <main className="grid min-h-screen place-items-center bg-[#F1F5F9] px-5 text-[#0B1D3A]"><section className="max-w-lg rounded-3xl border bg-white p-8 text-center"><h1 className="text-2xl font-black">Sign in to your shopkeeper portal</h1><p className="mt-3 text-sm leading-6 text-[#64748B]">Use the IlmAI Store account that your administrator registered for shopkeeper access.</p><Link href="/login" className="gold-btn mt-6 inline-flex min-h-12 px-6">Sign in</Link></section></main>;
  }

  const account = await ShopkeeperService.getForUser(user.id);

  return <ShopkeeperPortal
    account={account ? { jazzcashNumber: account.jazzcash_number, status: account.status } : null}
    email={user.email ?? "Signed-in account"}
  />;
}
