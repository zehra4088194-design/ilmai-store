import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { UniversityNoteRequestService } from "@/services/UniversityNoteRequestService";
import { isAppError } from "@/lib/errors";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ items: await UniversityNoteRequestService.adminList() });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    return NextResponse.json({ error: "Could not load university note requests." }, { status: 500 });
  }
}
