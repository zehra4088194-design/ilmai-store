import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getPlatformSettings, savePlatformSettings } from "@/lib/platform-settings/server";
import { exchangeRateSettingsSchema } from "@/validators/settings";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";

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

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(rateResponse(await getPlatformSettings()));
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    logger.error("GET /api/admin/settings/exchange-rate failed", { error: String(error) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = parseOrThrow(exchangeRateSettingsSchema, await request.json());
    const current = await getPlatformSettings();
    const saved = await savePlatformSettings(
      {
        ...current,
        exchangeRate: {
          ...current.exchangeRate,
          mode: input.mode,
          // Auto mode can only be changed by a successful API refresh.
          usdToPkr: input.mode === "manual" ? input.usdToPkr : current.exchangeRate.usdToPkr,
        },
      },
      admin.userId,
    );
    return NextResponse.json(rateResponse(saved));
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    logger.error("PATCH /api/admin/settings/exchange-rate failed", { error: String(error) });
    return NextResponse.json({ error: "Settings could not be saved." }, { status: 500 });
  }
}

// A refresh-from-provider POST used to be duplicated here and at
// /api/admin/settings/refresh-exchange-rate — ExchangeRateCard only ever
// called the latter, so the copy here was dead code. Removed; use
// POST /api/admin/settings/refresh-exchange-rate instead.
