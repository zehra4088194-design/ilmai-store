import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/admin";
import { CustomerService } from "@/services/CustomerService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** DELETE /api/account/addresses/[id] — remove a saved address, ownership-enforced. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await CustomerService.deleteAddress(userId, id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("DELETE /api/account/addresses/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
