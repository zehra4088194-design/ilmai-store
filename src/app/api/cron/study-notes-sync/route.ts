import { NextRequest, NextResponse } from "next/server";
import { StudyNotesSyncService } from "@/services/StudyNotesSyncService";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await StudyNotesSyncService.syncFromStudyApp();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Study Notes catalog sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Study Notes catalog sync failed." },
      { status: 500 },
    );
  }
}
