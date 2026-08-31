import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/auth/admin";
import { ProductService } from "@/services/ProductService";
import { ProductMediaService } from "@/services/ProductMediaService";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from "@/constants/upload";

/** POST /api/seller/products/[id]/media — upload a product photo. Ownership-checked before touching storage. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { sellerId } = await requireSeller();
    const { id } = await params;
    const existing = await ProductService.sellerGetById(sellerId, id); // throws NotFoundError if this seller doesn't own it

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as never)) return NextResponse.json({ error: "This file type is not allowed." }, { status: 400 });
    if (file.size < 1 || file.size > MAX_IMAGE_UPLOAD_BYTES) return NextResponse.json({ error: "This file is too large." }, { status: 400 });

    const result = await ProductMediaService.adminUpload(id, {
      name: file.name,
      type: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
      mediaType: "image",
      altText: String(form.get("altText") ?? "") || undefined,
      isPrimary: existing.media.length === 0,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.publicMessage }, { status: err.statusCode });
    logger.error("POST /api/seller/products/[id]/media failed", { error: String(err) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
