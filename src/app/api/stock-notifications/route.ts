import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StockNotificationService } from "@/services/StockNotificationService";
import { logger } from "@/lib/logger";

const schema = z.object({ variantId: z.string().uuid(), email: z.string().email() });

/** POST /api/stock-notifications — "notify me when back in stock" signup. Open to guests (email-only) as well as signed-in users. */
export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const { data: { user } } = await (await createSupabaseServerClient()).auth.getUser();
    await StockNotificationService.subscribe(body.variantId, body.email, user?.id);
    return NextResponse.json({ subscribed: true });
  } catch (err) {
    logger.error("POST /api/stock-notifications failed", { error: String(err) });
    return NextResponse.json({ error: "Could not save your notification request." }, { status: 400 });
  }
}
