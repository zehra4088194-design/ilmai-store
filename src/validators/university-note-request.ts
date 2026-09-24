import { z } from "zod";
import { UNIVERSITY_NOTE_RESOURCE_TYPES, UNIVERSITY_NOTE_STATUSES } from "@/constants/university-note-request";

const resourceTypeKeys = UNIVERSITY_NOTE_RESOURCE_TYPES.map(([key]) => key) as [string, ...string[]];

export const universityNoteRequestSchema = z.object({
  studentName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional(),
  university: z.string().trim().min(1).max(180),
  campus: z.string().trim().max(180).optional(),
  city: z.string().trim().max(100).optional(),
  program: z.string().trim().min(1).max(180),
  department: z.string().trim().max(180).optional(),
  degreeLevel: z.string().trim().max(100).optional(),
  yearOrSemester: z.string().trim().min(1).max(100),
  subject: z.string().trim().min(1).max(180),
  courseCode: z.string().trim().max(80).optional(),
  examSession: z.string().trim().max(120).optional(),
  language: z.string().trim().max(60).optional(),
  resourceTypes: z.array(z.enum(resourceTypeKeys as [string, ...string[]])).min(1).max(20),
  chaptersTopics: z.string().trim().max(3000).optional(),
  preferredFormat: z.enum(["printed", "digital", "both", "not_sure"]).optional(),
  neededBy: z.string().date().optional(),
  additionalDetails: z.string().trim().max(4000).optional(),
});

export const universityNoteRequestUpdateSchema = z.object({
  status: z.enum(UNIVERSITY_NOTE_STATUSES),
  adminNote: z.string().trim().max(4000).optional(),
});
