import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { refreshUsdToPkrRate } from "@/services/ExchangeRateService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  try {
    await requireAdmin();
    if (!process.env.EXCHANGE_RATE_API_KEY) {
      return NextResponse.json({ error: "EXCHANGE_RATE_API_KEY is not configured." }, { status: 503 });
    }

    const settings = await refreshUsdToPkrRate();
    return NextResponse.json({
      status: "success",
      rate: settings.exchangeRate.usdToPkr,
      usdToPkr: settings.exchangeRate.usdToPkr,
      fetchedRate: settings.exchangeRate.fetchedRate,
      fetchedAt: settings.exchangeRate.fetchedAt,
      lastUpdated: settings.exchangeRate.lastUpdated,
      mode: settings.exchangeRate.mode,
    });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    logger.error("POST /api/admin/settings/refresh-exchange-rate failed", { error: String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fetch USD/PKR rate." },
      { status: 502 },
    );
  }
}
