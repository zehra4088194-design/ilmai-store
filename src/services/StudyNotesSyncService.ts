import "server-only";

import { StudyNotesCatalogService } from "./StudyNotesCatalogService";

type CatalogResponse = {
  items: Array<{
    resourceId: string;
    academicLevel: "school" | "college";
    board: string | null;
    gradeLevel: string | null;
    subjectId: string | null;
    subjectName: string;
    subjectSlug: string;
    bookTitle: string;
    chapterId: string | null;
    chapterNumber: number | null;
    chapterName: string | null;
    chapterSlug: string | null;
    contentSection: "reading" | "numericals" | "mcq" | "short" | "long";
    resourceTitle: string;
    resourceDisplayOrder: number;
    pageCount: number | null;
    hasLightVersion: boolean;
    hasDarkVersion: boolean;
    sourceCreatedAt: string | null;
  }>;
  nextOffset: number | null;
  total: number;
};

function studyAppUrl() {
  return (process.env.ILMAI_STUDY_URL || process.env.NEXT_PUBLIC_ILMAI_STUDY_URL || "https://www.ilmai.study").replace(/\/$/, "");
}

function sharedSecret() {
  const secret = process.env.NOTES_PRODUCT_SYNC_SECRET;
  if (!secret) throw new Error("NOTES_PRODUCT_SYNC_SECRET is not configured.");
  return secret;
}

async function fetchPage(offset: number, limit: number): Promise<CatalogResponse> {
  const url = new URL("/api/internal/store/study-notes/catalog", studyAppUrl());
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${sharedSecret()}` },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error || `ilmAI catalog sync failed (${response.status}).`);
  return json as CatalogResponse;
}

export const StudyNotesSyncService = {
  async syncFromStudyApp(): Promise<{ fetched: number; inserted: number; updated: number; unchanged: number; unpublished: number; failed: number; pages: number; total: number }> {
    const startedAt = new Date().toISOString();
    const pageSize = 400;
    let offset = 0;
    let pages = 0;
    let total = 0;
    let fetched = 0;
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    while (true) {
      const page = await fetchPage(offset, pageSize);
      pages += 1;
      total = page.total;
      fetched += page.items.length;
      if (page.items.length) {
        const result = await StudyNotesCatalogService.upsertBatch(page.items);
        inserted += result.inserted;
        updated += result.updated;
        unchanged += result.unchanged;
      }
      if (page.nextOffset === null || page.items.length === 0) break;
      offset = page.nextOffset;
    }

    const unpublished = await StudyNotesCatalogService.markMissingUnavailable(startedAt);
    return { fetched, inserted, updated, unchanged, unpublished, failed: 0, pages, total };
  },
};
