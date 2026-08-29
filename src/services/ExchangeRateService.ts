import "server-only";
import { getPlatformSettings, savePlatformSettings } from "@/lib/platform-settings/server";
import type { PlatformSettings } from "@/lib/platform-settings/types";

type ExchangeRateResponse = {
  result?: string;
  conversion_rate?: number;
  base_code?: string;
  target_code?: string;
  time_last_update_utc?: string;
  "error-type"?: string;
};

export type FetchedExchangeRate = {
  rate: number;
  lastUpdated: string | null;
};

export async function fetchUsdToPkrRate(): Promise<FetchedExchangeRate> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) throw new Error("EXCHANGE_RATE_API_KEY is not configured.");

  const response = await fetch(
    `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/pair/USD/PKR`,
    { cache: "no-store", signal: AbortSignal.timeout(30_000) },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = (await response.json()) as ExchangeRateResponse;
  const rate = Number(data.conversion_rate);
  if (data.result !== "success" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(data["error-type"] || "Exchange rate API returned an invalid response.");
  }

  return { rate, lastUpdated: data.time_last_update_utc || null };
}

export async function refreshUsdToPkrRate(): Promise<PlatformSettings> {
  const [settings, fetched] = await Promise.all([getPlatformSettings(), fetchUsdToPkrRate()]);

  return savePlatformSettings({
    ...settings,
    exchangeRate: {
      ...settings.exchangeRate,
      usdToPkr: settings.exchangeRate.mode === "manual" ? settings.exchangeRate.usdToPkr : fetched.rate,
      lastUpdated: fetched.lastUpdated,
      fetchedAt: new Date().toISOString(),
      fetchedRate: fetched.rate,
    },
  });
}
