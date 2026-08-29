"use client";

import { useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import type { ExchangeRateSettings } from "@/lib/platform-settings/types";

type Props = { initialSettings: ExchangeRateSettings };
type RateResponse = {
  status: string;
  rate: number;
  usdToPkr: number;
  fetchedRate: number | null;
  fetchedAt: string | null;
  lastUpdated: string | null;
  mode: "auto" | "manual";
};

function displayDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not fetched yet";
}

export function ExchangeRateCard({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/settings/exchange-rate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: settings.mode, usdToPkr: settings.usdToPkr }),
      });
      const data = await response.json() as RateResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Settings could not be saved.");
      setSettings((current) => ({ ...current, ...data, base: "USD", target: "PKR" }));
      setMessage("Exchange-rate settings saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshRate() {
    setRefreshing(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/settings/refresh-exchange-rate", { method: "POST" });
      const data = await response.json() as RateResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Rate refresh failed.");
      setSettings((current) => ({ ...current, ...data, base: "USD", target: "PKR" }));
      setMessage("Rate refreshed from the provider.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Rate refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  return <section className="mt-10 rounded-3xl border bg-white p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Wallet pricing</p><h2 className="display-font mt-2 text-3xl text-[#103d42]">USD → PKR exchange rate</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#668084]">The daily rate powers JazzCash QR totals. Auto mode applies the latest provider rate; Hardcode keeps your chosen rate while still showing what the provider returned.</p></div><button type="button" onClick={refreshRate} disabled={refreshing} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold disabled:opacity-50"><RefreshCw size={15} className={refreshing ? "animate-spin" : ""}/> Refresh rate now</button></div><div className="mt-7 grid gap-6 lg:grid-cols-[1fr_1.3fr]"><div><p className="text-sm font-bold">Rate source</p><div className="mt-2 inline-flex rounded-full border p-1"><button type="button" onClick={() => setSettings((current) => ({ ...current, mode: "auto" }))} className={`rounded-full px-4 py-2 text-sm font-bold ${settings.mode === "auto" ? "bg-[#103d42] text-white" : "text-[#668084]"}`}>Auto</button><button type="button" onClick={() => setSettings((current) => ({ ...current, mode: "manual" }))} className={`rounded-full px-4 py-2 text-sm font-bold ${settings.mode === "manual" ? "bg-[#103d42] text-white" : "text-[#668084]"}`}>Hardcode</button></div><label className="mt-5 block text-sm font-bold">{settings.mode === "manual" ? "USD = PKR (your rate)" : "USD = PKR"}<input type="number" min="1" step="0.01" value={settings.usdToPkr || ""} disabled={settings.mode !== "manual"} onChange={(event) => setSettings((current) => ({ ...current, usdToPkr: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-lg font-bold outline-none focus:border-[#14777a] disabled:cursor-not-allowed disabled:bg-[#f5f7f3] disabled:text-[#668084]"/></label><button type="button" onClick={saveSettings} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#103d42] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Save size={15}/> {saving ? "Saving…" : "Save settings"}</button></div><div className="grid gap-3 sm:grid-cols-2"><InfoTile label="Fetched rate (API)" value={settings.fetchedRate ? `PKR ${settings.fetchedRate.toFixed(2)}` : "Not fetched yet"} detail={displayDate(settings.fetchedAt)}/><InfoTile label="Provider timestamp" value={settings.lastUpdated ? "Available" : "Not available"} detail={displayDate(settings.lastUpdated)}/></div></div>{message && <p className="mt-5 text-sm font-semibold text-[#14777a]">{message}</p>}{error && <p className="mt-5 text-sm font-semibold text-red-700">{error}</p>}</section>;
}

function InfoTile({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl bg-[#f5f7f3] p-4"><p className="text-xs font-bold uppercase tracking-widest text-[#668084]">{label}</p><p className="mt-3 text-lg font-black text-[#103d42]">{value}</p><p className="mt-1 text-xs text-[#668084]">{detail}</p></div>; }
