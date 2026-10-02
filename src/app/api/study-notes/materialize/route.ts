import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { StudyNotesMaterializationService } from "@/services/StudyNotesMaterializationService";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getClientAddress, rateLimiter } from "@/lib/rate-limit";

const schema = z.object({
  resourceId: z.string().uuid(),
  theme: z.enum(["light", "dark"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rate = await rateLimiter.check(\`study-notes-materialize:\${getClientAddress(request)}\`, 30, 60);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many note requests. Please try again shortly." }, { status: 429 });
    }
    const input = parseOrThrow(schema, await request.json());
    const result = await StudyNotesMaterializationService.materialize(input.resourceId, input.theme);
    return NextResponse.json(result);
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    logger.error("POST /api/study-notes/materialize failed", { error: String(error) });
    return NextResponse.json({ error: "The study note could not be prepared." }, { status: 500 });
  }
}
