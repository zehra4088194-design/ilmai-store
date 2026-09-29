import { ShopkeeperManager } from "@/components/admin/ShopkeeperManager";
import { ShopkeeperService } from "@/services/ShopkeeperService";

export const dynamic = "force-dynamic";

export default async function AdminShopkeepersPage() {
  const shopkeepers = await ShopkeeperService.listForAdmin();
  return <main className="mx-auto max-w-6xl p-6 lg:p-10">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Service access</p>
    <h1 className="display-font mt-2 text-5xl">Shopkeepers</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B]">Accounts appear after a paid JazzCash Dynamic QR service order. Configure and verify the provider-issued receiving identifier before activating QR generation. Suspended or revoked accounts cannot generate QRs.</p>
    <ShopkeeperManager shopkeepers={shopkeepers} />
  </main>;
}
