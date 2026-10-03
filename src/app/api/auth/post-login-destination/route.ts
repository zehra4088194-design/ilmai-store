import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ShopkeeperService } from "@/services/ShopkeeperService";

function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

/**
 * Resolve the Store landing page after a successful sign-in.
 *
 * Shopkeeper access is an admin-provisioned capability, not a public Store
 * product or role that anyone can self-select. A provisioned shopkeeper is
 * quietly sent to the dedicated portal; everyone else follows the requested
 * Store destination.
 */
export async function GET(request: NextRequest) {
  const destination = safeRedirect(request.nextUrl.searchParams.get("redirect"));
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ destination }, { status: 401 });
  }

  const shopkeeper = await ShopkeeperService.getForUser(user.id);
  if (shopkeeper) {
    return NextResponse.json({ destination: "/shopkeeper" });
  }

  return NextResponse.json({ destination });
}
