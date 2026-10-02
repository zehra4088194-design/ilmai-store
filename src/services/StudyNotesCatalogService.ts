import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";

export type StudyNoteCatalogEntry = {
  resourceId: string;
  academicLevel: "school" | "college";
  board?: string | null;
  gradeLevel?: string | null;
  subjectId?: string | null;
  subjectName: string;
  subjectSlug: string;
  bookTitle: string;
  chapterId?: string | null;
  chapterNumber?: number | null;
  chapterName?: string | null;
  chapterSlug?: string | null;
  contentSection: "reading" | "numericals" | "mcq" | "short" | "long";
  sectionOrder: number;
  resourceTitle: string;
  resourceDisplayOrder: number;
  pageCount?: number | null;
  hasLightVersion: boolean;
  hasDarkVersion: boolean;
  isAvailable: boolean;
  productId?: string | null;
  productSlug?: string | null;
};

type Raw = Record<string, any>;

const SECTION_ORDER: Record<StudyNoteCatalogEntry["contentSection"], number> = {
  reading: 0,
  numericals: 1,
  mcq: 2,
  short: 3,
  long: 4,
};

function mapRow(row: Raw): StudyNoteCatalogEntry {
  const section = (row.content_section || "reading") as StudyNoteCatalogEntry["contentSection"];
  return {
    resourceId: row.resource_id,
    academicLevel: row.academic_level,
    board: row.board ?? null,
    gradeLevel: row.grade_level ?? null,
    subjectId: row.subject_id ?? null,
    subjectName: row.subject_name,
    subjectSlug: row.subject_slug,
    bookTitle: row.book_title,
    chapterId: row.chapter_id ?? null,
    chapterNumber: row.chapter_number ?? null,
    chapterName: row.chapter_name ?? null,
    chapterSlug: row.chapter_slug ?? null,
    contentSection: section,
    sectionOrder: row.section_order ?? SECTION_ORDER[section] ?? 99,
    resourceTitle: row.resource_title,
    resourceDisplayOrder: row.resource_display_order ?? 0,
    pageCount: row.page_count ?? null,
    hasLightVersion: Boolean(row.has_light_version),
    hasDarkVersion: Boolean(row.has_dark_version),
    isAvailable: Boolean(row.is_available),
    productId: row.product_id ?? null,
    productSlug: row.product_slug ?? null,
  };
}

export type StudyNoteFilters = {
  academicLevel?: "school" | "college";
  gradeLevel?: string;
  subjectSlug?: string;
  bookTitle?: string;
  chapterSlug?: string;
  contentSection?: StudyNoteCatalogEntry["contentSection"];
  search?: string;
  page?: number;
  pageSize?: number;
};

export const StudyNotesCatalogService = {
  async list(filters: StudyNoteFilters = {}): Promise<{ items: StudyNoteCatalogEntry[]; total: number }> {
    const db = await createSupabaseServerClient();
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(60, Math.max(1, filters.pageSize ?? 24));
    let request = db
      .from("study_note_catalog")
      .select("*", { count: "exact" })
      .eq("is_available", true);

    if (filters.academicLevel) request = request.eq("academic_level", filters.academicLevel);
    if (filters.gradeLevel) request = request.eq("grade_level", filters.gradeLevel);
    if (filters.subjectSlug) request = request.eq("subject_slug", filters.subjectSlug);
    if (filters.bookTitle) request = request.eq("book_title", filters.bookTitle);
    if (filters.chapterSlug) request = request.eq("chapter_slug", filters.chapterSlug);
    if (filters.contentSection) request = request.eq("content_section", filters.contentSection);

    const term = filters.search?.trim();
    if (term) {
      const safe = term.replace(/[(),]/g, " ").replace(/[%_]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
      if (safe) {
        const pattern = \`%\${safe}%\`;
        request = request.or([
          \`resource_title.ilike.\${pattern}\`,
          \`subject_name.ilike.\${pattern}\`,
          \`book_title.ilike.\${pattern}\`,
          \`chapter_name.ilike.\${pattern}\`,
        ].join(","));
      }
    }

    request = request
      .order("subject_name")
      .order("book_title")
      .order("chapter_number", { ascending: true, nullsFirst: false })
      .order("section_order")
      .order("resource_display_order")
      .order("resource_title");

    const from = (page - 1) * pageSize;
    const { data, error, count } = await request.range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    return { items: (data ?? []).map(mapRow), total: count ?? (data ?? []).length };
  },

  async listAllForNavigation(): Promise<StudyNoteCatalogEntry[]> {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("study_note_catalog")
      .select("*")
      .eq("is_available", true)
      .order("subject_name")
      .order("book_title")
      .order("chapter_number", { ascending: true, nullsFirst: false })
      .order("section_order")
      .order("resource_display_order")
      .order("resource_title")
      .limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  },

  async getByResourceId(resourceId: string): Promise<StudyNoteCatalogEntry | null> {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("study_note_catalog")
      .select("*")
      .eq("resource_id", resourceId)
      .eq("is_available", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data) : null;
  },

  async getByResourceIdAdmin(resourceId: string): Promise<StudyNoteCatalogEntry | null> {
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from("study_note_catalog")
      .select("*")
      .eq("resource_id", resourceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data) : null;
  },

  async upsertBatch(rows: Raw[]): Promise<void> {
    if (!rows.length) return;
    const db = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const payload = rows.map((row) => ({
      resource_id: row.resourceId,
      academic_level: row.academicLevel,
      board: row.board ?? null,
      grade_level: row.gradeLevel ?? null,
      subject_id: row.subjectId ?? null,
      subject_name: row.subjectName,
      subject_slug: row.subjectSlug,
      book_title: row.bookTitle,
      chapter_id: row.chapterId ?? null,
      chapter_number: row.chapterNumber ?? null,
      chapter_name: row.chapterName ?? null,
      chapter_slug: row.chapterSlug ?? null,
      content_section: row.contentSection,
      section_order: SECTION_ORDER[row.contentSection as StudyNoteCatalogEntry["contentSection"]] ?? 99,
      resource_type: "notes",
      resource_title: row.resourceTitle,
      resource_display_order: row.resourceDisplayOrder ?? 0,
      page_count: row.pageCount ?? null,
      has_light_version: Boolean(row.hasLightVersion),
      has_dark_version: Boolean(row.hasDarkVersion),
      is_available: true,
      source_created_at: row.sourceCreatedAt ?? null,
      last_synced_at: now,
      updated_at: now,
    }));
    const { error } = await db.from("study_note_catalog").upsert(payload, { onConflict: "resource_id" });
    if (error) throw new Error(error.message);
  },

  async markMissingUnavailable(syncStartedAt: string): Promise<number> {
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from("study_note_catalog")
      .update({ is_available: false, updated_at: new Date().toISOString() })
      .lt("last_synced_at", syncStartedAt)
      .eq("is_available", true)
      .select("resource_id");
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  },

  async linkMaterializedProduct(resourceId: string, productId: string, productSlug: string): Promise<void> {
    const db = createSupabaseAdminClient();
    const { error } = await db
      .from("study_note_catalog")
      .update({ product_id: productId, product_slug: productSlug, updated_at: new Date().toISOString() })
      .eq("resource_id", resourceId);
    if (error) throw new Error(error.message);
  },

  sectionOrder: SECTION_ORDER,
};
