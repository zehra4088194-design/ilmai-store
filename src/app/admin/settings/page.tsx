import { getPlatformSettings } from "@/lib/platform-settings/server";
import { ExchangeRateCard } from "@/components/admin/ExchangeRateCard";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();
  return <main className="mx-auto max-w-6xl p-6 lg:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Store configuration</p><h1 className="display-font mt-2 text-5xl">Settings</h1><div className="mt-8 max-w-2xl"><ExchangeRateCard initialSettings={settings.exchangeRate} /></div><p className="mt-6 max-w-2xl text-sm leading-6 text-[#64748B]">The automatic exchange rate is refreshed by the scheduled job. Manual mode is useful when you want to lock the JazzCash conversion rate for a campaign or a known settlement period.</p></main>;
}
