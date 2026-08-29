export type ExchangeRateSettings = {
  usdToPkr: number;
  base: "USD";
  target: "PKR";
  lastUpdated: string | null;
  fetchedAt: string | null;
  mode: "auto" | "manual";
  fetchedRate: number | null;
};

export type PlatformSettings = {
  exchangeRate: ExchangeRateSettings;
};

export const DEFAULT_EXCHANGE_RATE_SETTINGS: ExchangeRateSettings = {
  usdToPkr: 280,
  base: "USD",
  target: "PKR",
  lastUpdated: null,
  fetchedAt: null,
  mode: "auto",
  fetchedRate: null,
};

export const PLATFORM_SETTINGS_KEY = "store_settings";
