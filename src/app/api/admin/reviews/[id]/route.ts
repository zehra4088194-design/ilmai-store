import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ReviewService } from "@/services/ReviewService";
import { isAppError, ValidationError } from "@/lib/errors";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const body = await request.json() as { status?: string };
    if (body.status !== "approved" && body.status !== "rejected") throw new ValidationError("Status must be approved or rejected.");
    const review = await ReviewService.adminModerate((await params).id, body.status);
    return NextResponse.json(review);
  } catch (error) { if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode }); return NextResponse.json({ error: "Review could not be moderated." }, { status: 500 }); }
}
