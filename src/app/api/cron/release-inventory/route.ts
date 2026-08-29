import { NextResponse } from "next/server";
import { InventoryService } from "@/services/InventoryService";
import { PromotionService } from "@/services/PromotionService";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [releasedOrders, releasedCoupons] = await Promise.all([InventoryService.releaseExpired(), PromotionService.releaseExpiredCoupons()]);
    return NextResponse.json({ releasedOrders, releasedCoupons });
  } catch (error) {
    logger.error("inventory.release_expired_failed", { error: String(error) });
    return NextResponse.json({ error: "Inventory cleanup failed." }, { status: 500 });
  }
}
