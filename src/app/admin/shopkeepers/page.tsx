import { ShopkeeperManager } from "@/components/admin/ShopkeeperManager";
import { ShopkeeperService } from "@/services/ShopkeeperService";

export const dynamic = "force-dynamic";

export default async function AdminShopkeepersPage() {
  const shopkeepers = await ShopkeeperService.listForAdmin();

  return (
    <main className="mx-auto max-w-6xl p-5 sm:p-8 lg:p-10">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#0F766E]">Merchant administration</p>
        <h1 className="display-font mt-2 text-4xl font-black sm:text-5xl">Merchants</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B]">
          Add a shop by name only. IlmAI generates its login credentials; the shopkeeper submits their own JazzCash receiving details, then you verify and activate the account.
        </p>
      </div>
      <ShopkeeperManager shopkeepers={shopkeepers} />
    </main>
  );
}
