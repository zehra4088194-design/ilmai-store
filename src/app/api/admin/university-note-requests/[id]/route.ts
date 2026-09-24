import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { UniversityNoteRequestService } from "@/services/UniversityNoteRequestService";
import { universityNoteRequestUpdateSchema } from "@/validators/university-note-request";
import { isAppError, parseOrThrow } from "@/lib/errors";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = parseOrThrow(universityNoteRequestUpdateSchema, await request.json());
    return NextResponse.json({ request: await UniversityNoteRequestService.adminUpdate(id, input) });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    return NextResponse.json({ error: "Request could not be updated." }, { status: 500 });
  }
}
