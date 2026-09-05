import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ProductService } from "@/services/ProductService";
import { adminCreateProductSchema } from "@/validators/product";
import { parseCsv } from "@/lib/csv";
import { PRODUCT_TYPES, PHYSICAL_PRODUCT_TYPES } from "@/constants/product";
import { logger } from "@/lib/logger";

type RowResult = { row: number; slug: string; ok: boolean; error?: string };

/**
 * POST /api/admin/products/import — bulk-create simple (single-variant)
 * products from a CSV file. One row = one product with one default
 * variant; for multi-variant listings, use the regular product form.
 * Expected columns: slug, title, description, productType, basePriceRupees,
 * currency, compareAtPriceRupees, deliveryFeeRupees, sku, stockQuantity,
 * isFeatured. Every row is attempted independently — one bad row (a
 * duplicate slug, a missing required field) doesn't stop the rest.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No CSV file was uploaded." }, { status: 400 });
    const text = await file.text();
    const records = parseCsv(text);
    if (!records.length) return NextResponse.json({ error: "The CSV file has no data rows." }, { status: 400 });
    if (records.length > 500) return NextResponse.json({ error: "Import is limited to 500 rows at a time." }, { status: 400 });

    const results: RowResult[] = [];
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (!r) continue;
      const rowNumber = i + 2; // 1-indexed + header row
      try {
        const productType = r.productType?.trim();
        if (!productType || !(PRODUCT_TYPES as readonly string[]).includes(productType)) throw new Error(`Unknown productType "${r.productType}" — must be one of ${PRODUCT_TYPES.join(", ")}.`);
        const isPhysical = (PHYSICAL_PRODUCT_TYPES as readonly string[]).includes(productType);
        const basePriceMinor = Math.round(Number(r.basePriceRupees) * 100);
        if (!Number.isFinite(basePriceMinor) || basePriceMinor < 0) throw new Error(`Invalid basePriceRupees "${r.basePriceRupees}".`);
        const currency = (r.currency?.trim() || "PKR").toUpperCase();
        const sku = r.sku?.trim() || r.slug?.trim();
        if (!sku) throw new Error("sku (or slug, used as a fallback) is required.");

        const input = adminCreateProductSchema.parse({
          slug: r.slug?.trim(),
          title: r.title?.trim(),
          description: r.description?.trim() || undefined,
          productType,
          status: "draft",
          basePriceMinor,
          currency,
          compareAtPriceMinor: r.compareAtPriceRupees ? Math.round(Number(r.compareAtPriceRupees) * 100) : undefined,
          deliveryFeeMinor: isPhysical && r.deliveryFeeRupees ? Math.round(Number(r.deliveryFeeRupees) * 100) : 0,
          isFeatured: r.isFeatured?.trim().toLowerCase() === "true",
          categoryIds: [],
          variants: [{
            sku,
            name: "Default",
            priceMinor: basePriceMinor,
            currency,
            isDefault: true,
            requiresShipping: isPhysical,
            stockQuantity: isPhysical && r.stockQuantity ? Math.max(0, Math.round(Number(r.stockQuantity))) : undefined,
          }],
        });
        await ProductService.adminCreate(input);
        results.push({ row: rowNumber, slug: input.slug, ok: true });
      } catch (err) {
        results.push({ row: rowNumber, slug: r.slug || "(missing)", ok: false, error: err instanceof Error ? err.message : "Could not create this row." });
      }
    }

    const created = results.filter((r) => r.ok).length;
    return NextResponse.json({ created, failed: results.length - created, results });
  } catch (err) {
    logger.error("POST /api/admin/products/import failed", { error: String(err) });
    return NextResponse.json({ error: "Import could not be processed." }, { status: 500 });
  }
}
