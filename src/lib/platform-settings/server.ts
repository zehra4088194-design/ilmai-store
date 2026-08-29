import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import {
  DEFAULT_EXCHANGE_RATE_SETTINGS,
  PLATFORM_SETTINGS_KEY,
  type ExchangeRateSettings,
  type PlatformSettings,
} from "./types";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeExchangeRate(value: unknown): ExchangeRateSettings {
  const source = isJsonObject(value) ? value : {};
  const usdToPkr = Number(source.usdToPkr);
  const fetchedRate = source.fetchedRate === null ? null : Number(source.fetchedRate);

  return {
    usdToPkr: Number.isFinite(usdToPkr) && usdToPkr > 0 ? usdToPkr : DEFAULT_EXCHANGE_RATE_SETTINGS.usdToPkr,
    base: "USD",
    target: "PKR",
    lastUpdated: nullableString(source.lastUpdated),
    fetchedAt: nullableString(source.fetchedAt),
    mode: source.mode === "manual" ? "manual" : "auto",
    fetchedRate: fetchedRate !== null && Number.isFinite(fetchedRate) && fetchedRate > 0 ? fetchedRate : null,
  };
}

function normalizeSettings(value: unknown): PlatformSettings {
  const source = isJsonObject(value) ? value : {};
  return { exchangeRate: normalizeExchangeRate(source.exchangeRate) };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const { data, error } = await createSupabaseAdminClient()
    .from("platform_settings")
    .select("value")
    .eq("key", PLATFORM_SETTINGS_KEY)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return normalizeSettings(data?.value);
}

export async function savePlatformSettings(
  settings: PlatformSettings,
  updatedBy?: string,
): Promise<PlatformSettings> {
  const normalized = normalizeSettings(settings);
  const { data, error } = await createSupabaseAdminClient()
    .from("platform_settings")
    .upsert(
      {
        key: PLATFORM_SETTINGS_KEY,
        value: normalized,
        updated_by: updatedBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    )
    .select("value")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Platform settings could not be saved.");
  return normalizeSettings(data.value);
}
