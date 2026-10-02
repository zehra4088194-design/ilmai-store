import "server-only";

import { ProductService } from "./ProductService";
import { StudyNotesCatalogService } from "./StudyNotesCatalogService";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { ValidationError } from "@/lib/errors";

export type StudyNoteTheme = "light" | "dark";

type RemoteResource = {
  resourceId: string;
  title: string;
  pageCount: number;
  priceRs: number;
  priceMinor: number;
  hasLightVersion: boolean;
  hasDarkVersion: boolean;
  coverSvg: string;
};

function studyAppUrl() {
  return (process.env.ILMAI_STUDY_URL || process.env.NEXT_PUBLIC_ILMAI_STUDY_URL || "https://www.ilmai.study").replace(/\/$/, "");
}

function sharedSecret() {
  const secret = process.env.NOTES_PRODUCT_SYNC_SECRET;
  if (!secret) throw new Error("NOTES_PRODUCT_SYNC_SECRET is not configured.");
  return secret;
}

async function fetchPrintableResource(resourceId: string): Promise<RemoteResource> {
  const url = new URL(`/api/internal/store/study-notes/resource/${encodeURIComponent(resourceId)}`, studyAppUrl());
  url.searchParams.set("resolvePrice", "1");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${sharedSecret()}` },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error || `ilmAI resource resolution failed (${response.status}).`);
  return json as RemoteResource;
}

export const StudyNotesMaterializationService = {
  async materialize(resourceId: string, theme?: StudyNoteTheme) {
    const remote = await fetchPrintableResource(resourceId);
    const availableThemes: StudyNoteTheme[] = [];
    if (remote.hasLightVersion) availableThemes.push("light");
    if (remote.hasDarkVersion) availableThemes.push("dark");
    if (!availableThemes.length) throw new ValidationError("This study note has no printable theme available.");
    const selectedTheme = theme || (availableThemes.length === 1 ? availableThemes[0] : undefined);
    if (!selectedTheme || !availableThemes.includes(selectedTheme)) {
      throw new ValidationError("Choose a Light or Dark theme before adding this note to your basket.");
    }

    let productResult: { id: string; slug: string; url: string };
    try {
      productResult = await ProductService.syncNotesProduct({
        resourceId,
        title: remote.title,
        priceMinor: remote.priceMinor,
        pageCount: remote.pageCount,
        hasLightVersion: remote.hasLightVersion,
        hasDarkVersion: remote.hasDarkVersion,
        coverSvg: remote.coverSvg,
      });
    } catch (error) {
      // Two students can materialize the same source UUID at the same time. The
      // deterministic slug/SKU prevents duplicates; on the losing request, load
      // the already-created canonical product instead of surfacing a fake failure.
      const db = createSupabaseAdminClient();
      const { data: existing } = await db
        .from("products")
        .select("id,slug")
        .eq("slug", `notes-${resourceId}`)
        .maybeSingle();
      if (!existing) throw error;
      productResult = {
        id: existing.id,
        slug: existing.slug,
        url: `${(process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://ilmai.store").replace(/\/$/, "")}/store/${existing.slug}`,
      };
    }

    const db = createSupabaseAdminClient();
    const variantName = selectedTheme === "dark" ? "Dark theme" : "Light theme";
    const { data: variant, error: variantError } = await db
      .from("product_variants")
      .select("id,price_minor,currency")
      .eq("product_id", productResult.id)
      .eq("name", variantName)
      .maybeSingle();
    if (variantError || !variant) throw new Error(variantError?.message || "The requested print theme is unavailable.");

    await StudyNotesCatalogService.linkMaterializedProduct(resourceId, productResult.id, productResult.slug);

    return {
      productId: productResult.id,
      productSlug: productResult.slug,
      productUrl: productResult.url,
      variantId: variant.id as string,
      theme: selectedTheme,
      priceMinor: variant.price_minor as number,
      currency: variant.currency as string,
    };
  },
};
