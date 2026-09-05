import { NextResponse } from "next/server";
import { AbandonedCartService } from "@/services/AbandonedCartService";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await AbandonedCartService.sendReminders();
    return NextResponse.json(result);
  } catch (error) {
    logger.error("abandoned_cart.cron_failed", { error: String(error) });
    return NextResponse.json({ error: "Abandoned cart reminder run failed." }, { status: 500 });
  }
}
