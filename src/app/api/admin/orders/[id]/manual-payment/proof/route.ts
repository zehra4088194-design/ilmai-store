import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ManualPaymentService } from "@/services/ManualPaymentService";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const url = await ManualPaymentService.adminProofUrl(id);
  if (!url) return NextResponse.json({ error: "No payment proof uploaded." }, { status: 404 });
  return NextResponse.redirect(url);
}
