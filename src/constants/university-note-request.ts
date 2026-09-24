export const UNIVERSITY_NOTE_RESOURCE_TYPES = [
  ["complete_notes", "Complete Notes"],
  ["chapter_notes", "Chapter-wise Notes"],
  ["short_questions", "Short Questions"],
  ["long_questions", "Long Questions"],
  ["mcqs", "MCQs"],
  ["past_papers", "Past Papers"],
  ["solved_past_papers", "Solved Past Papers"],
  ["important_questions", "Important / Guess Questions"],
  ["assignments", "Assignments"],
  ["lab_practical", "Lab / Practical"],
  ["viva_questions", "Viva Questions"],
  ["lecture_notes", "Lecture / Presentation Notes"],
  ["handwritten_notes", "Handwritten Notes"],
  ["revision_summary", "Revision / Summary"],
  ["other", "Other"],
] as const;

export const UNIVERSITY_NOTE_RESOURCE_LABELS = Object.fromEntries(UNIVERSITY_NOTE_RESOURCE_TYPES) as Record<string, string>;

export const UNIVERSITY_NOTE_STATUSES = ["pending", "in_progress", "fulfilled", "cancelled"] as const;
