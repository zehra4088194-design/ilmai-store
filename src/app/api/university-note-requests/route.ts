import { NextRequest, NextResponse } from "next/server";
import { UniversityNoteRequestService } from "@/services/UniversityNoteRequestService";
import { EmailService } from "@/services/EmailService";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClientAddress, rateLimiter } from "@/lib/rate-limit";
import { isAppError, parseOrThrow } from "@/lib/errors";
import { universityNoteRequestSchema } from "@/validators/university-note-request";
import { UNIVERSITY_NOTE_RESOURCE_LABELS } from "@/constants/university-note-request";

export async function POST(request: NextRequest) {
  try {
    const rate = await rateLimiter.check(`university-note-request:${getClientAddress(request)}`, 5, 60 * 60);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000))) } },
      );
    }

    const input = parseOrThrow(universityNoteRequestSchema, await request.json());
    const { data: { user } } = await (await createSupabaseServerClient()).auth.getUser();
    const created = await UniversityNoteRequestService.create(input, user?.id);

    await EmailService.sendUniversityNoteRequestNotification({
      requestNumber: created.requestNumber,
      studentName: created.studentName,
      email: created.email,
      phone: created.phone,
      university: created.university,
      campus: created.campus,
      city: created.city,
      program: created.program,
      department: created.department,
      yearOrSemester: created.yearOrSemester,
      subject: created.subject,
      courseCode: created.courseCode,
      examSession: created.examSession,
      resourceTypes: created.resourceTypes.map((key) => UNIVERSITY_NOTE_RESOURCE_LABELS[key] ?? key).join(", "),
      chaptersTopics: created.chaptersTopics,
      preferredFormat: created.preferredFormat,
      neededBy: created.neededBy,
      additionalDetails: created.additionalDetails,
    });

    return NextResponse.json({ requestNumber: created.requestNumber }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.publicMessage }, { status: error.statusCode });
    return NextResponse.json({ error: "Your note request could not be submitted right now." }, { status: 500 });
  }
}
