import "server-only";

import { randomInt } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import type { z } from "zod";
import type { universityNoteRequestSchema, universityNoteRequestUpdateSchema } from "@/validators/university-note-request";

type CreateInput = z.infer<typeof universityNoteRequestSchema>;
type UpdateInput = z.infer<typeof universityNoteRequestUpdateSchema>;

export type UniversityNoteRequest = {
  id: string;
  requestNumber: string;
  userId?: string;
  studentName: string;
  email: string;
  phone?: string;
  university: string;
  campus?: string;
  city?: string;
  program: string;
  department?: string;
  degreeLevel?: string;
  yearOrSemester: string;
  subject: string;
  courseCode?: string;
  examSession?: string;
  language?: string;
  resourceTypes: string[];
  chaptersTopics?: string;
  preferredFormat?: string;
  neededBy?: string;
  additionalDetails?: string;
  status: "pending" | "in_progress" | "fulfilled" | "cancelled";
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: Record<string, unknown>): UniversityNoteRequest {
  return {
    id: String(row.id),
    requestNumber: String(row.request_number),
    userId: row.user_id ? String(row.user_id) : undefined,
    studentName: String(row.student_name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : undefined,
    university: String(row.university),
    campus: row.campus ? String(row.campus) : undefined,
    city: row.city ? String(row.city) : undefined,
    program: String(row.program),
    department: row.department ? String(row.department) : undefined,
    degreeLevel: row.degree_level ? String(row.degree_level) : undefined,
    yearOrSemester: String(row.year_or_semester),
    subject: String(row.subject),
    courseCode: row.course_code ? String(row.course_code) : undefined,
    examSession: row.exam_session ? String(row.exam_session) : undefined,
    language: row.language ? String(row.language) : undefined,
    resourceTypes: Array.isArray(row.resource_types) ? row.resource_types.map(String) : [],
    chaptersTopics: row.chapters_topics ? String(row.chapters_topics) : undefined,
    preferredFormat: row.preferred_format ? String(row.preferred_format) : undefined,
    neededBy: row.needed_by ? String(row.needed_by) : undefined,
    additionalDetails: row.additional_details ? String(row.additional_details) : undefined,
    status: row.status as UniversityNoteRequest["status"],
    adminNote: row.admin_note ? String(row.admin_note) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function nextRequestNumber(): Promise<string> {
  const db = createSupabaseAdminClient();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `UN-${new Date().getFullYear()}-${randomInt(100000, 1000000)}`;
    const { data } = await db.from("university_note_requests").select("id").eq("request_number", candidate).maybeSingle();
    if (!data) return candidate;
  }
  throw new Error("Could not generate a unique university note request number.");
}

export const UniversityNoteRequestService = {
  async create(input: CreateInput, userId?: string): Promise<UniversityNoteRequest> {
    const db = createSupabaseAdminClient();
    const requestNumber = await nextRequestNumber();
    const { data, error } = await db.from("university_note_requests").insert({
      request_number: requestNumber,
      user_id: userId ?? null,
      student_name: input.studentName,
      email: input.email,
      phone: input.phone || null,
      university: input.university,
      campus: input.campus || null,
      city: input.city || null,
      program: input.program,
      department: input.department || null,
      degree_level: input.degreeLevel || null,
      year_or_semester: input.yearOrSemester,
      subject: input.subject,
      course_code: input.courseCode || null,
      exam_session: input.examSession || null,
      language: input.language || null,
      resource_types: input.resourceTypes,
      chapters_topics: input.chaptersTopics || null,
      preferred_format: input.preferredFormat || null,
      needed_by: input.neededBy || null,
      additional_details: input.additionalDetails || null,
    }).select("*").single();
    if (error || !data) throw new Error(error?.message ?? "Request could not be created.");
    return mapRow(data as Record<string, unknown>);
  },

  async adminList(status?: UniversityNoteRequest["status"]): Promise<UniversityNoteRequest[]> {
    let query = createSupabaseAdminClient().from("university_note_requests").select("*").order("created_at", { ascending: false }).limit(500);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  },

  async adminUpdate(id: string, input: UpdateInput): Promise<UniversityNoteRequest> {
    const { data, error } = await createSupabaseAdminClient().from("university_note_requests").update({
      status: input.status,
      admin_note: input.adminNote || null,
    }).eq("id", id).select("*").single();
    if (error || !data) throw new Error(error?.message ?? "Request could not be updated.");
    return mapRow(data as Record<string, unknown>);
  },
};
