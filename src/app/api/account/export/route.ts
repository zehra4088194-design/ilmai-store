import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/admin";
import { OrderService } from "@/services/OrderService";
import { WishlistService } from "@/services/WishlistService";
import { CustomerService } from "@/services/CustomerService";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * GET /api/account/export — everything tied to the current account, as one
 * downloadable JSON file: profile, addresses, orders, wishlist, reviews.
 * No account-deletion/data-portability route existed at all before this.
 */
export async function GET() {
  try {
    const { userId, email } = await requireUser();
    const db = createSupabaseAdminClient();

    const [{ data: profile }, orders, wishlistProducts, addresses, reviewsResult] = await Promise.all([
      db.from("profiles").select("full_name, phone, avatar_url, created_at").eq("id", userId).maybeSingle(),
      OrderService.listForUser(userId),
      WishlistService.list(userId),
      CustomerService.listAddresses(userId),
      db.from("reviews").select("product_id, rating, title, body, moderation_status, created_at").eq("user_id", userId),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      account: { email, ...profile },
      addresses,
      orders,
      wishlist: wishlistProducts.map((p) => ({ id: p.id, title: p.title, slug: p.slug })),
      reviews: reviewsResult.data ?? [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ilmai-store-account-export-${userId}.json"`,
      },
    });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("GET /api/account/export failed", { error: String(err) });
    return NextResponse.json({ error: "Could not export your data." }, { status: 500 });
  }
}
