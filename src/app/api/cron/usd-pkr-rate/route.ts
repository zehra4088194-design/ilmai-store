import { NextRequest, NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/platform-settings/server";
import { refreshUsdToPkrRate } from "@/services/ExchangeRateService";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

function rateResponse(settings: Awaited<ReturnType<typeof getPlatformSettings>>) {
  return {
    status: "success",
    rate: settings.exchangeRate.usdToPkr,
    usdToPkr: settings.exchangeRate.usdToPkr,
    fetchedRate: settings.exchangeRate.fetchedRate,
    fetchedAt: settings.exchangeRate.fetchedAt,
    lastUpdated: settings.exchangeRate.lastUpdated,
    mode: settings.exchangeRate.mode,
  };
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.EXCHANGE_RATE_API_KEY) {
    return NextResponse.json(
      { status: "error", error: "EXCHANGE_RATE_API_KEY is not configured." },
      { status: 503 },
    );
  }

  try {
    const saved = await refreshUsdToPkrRate();
    return NextResponse.json(rateResponse(saved));
  } catch (error) {
    logger.error("usd_pkr_rate.cron_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    const settings = await getPlatformSettings();
    return NextResponse.json(
      {
        status: "fallback",
        error: error instanceof Error ? error.message : "Could not fetch USD/PKR rate.",
        rate: settings.exchangeRate.usdToPkr,
        fetchedAt: settings.exchangeRate.fetchedAt,
      },
      { status: 502 },
    );
  }
}
