import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ProductMediaService } from "@/services/ProductMediaService";
import { ALLOWED_DIGITAL_FILE_MIME_TYPES, ALLOWED_IMAGE_MIME_TYPES, MAX_DIGITAL_FILE_UPLOAD_BYTES, MAX_IMAGE_UPLOAD_BYTES } from "@/constants/upload";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const form = await request.formData();
  const file = form.get("file");
  const mediaType = String(form.get("mediaType") ?? "image");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  const allowed = mediaType === "digital_file" ? ALLOWED_DIGITAL_FILE_MIME_TYPES : ALLOWED_IMAGE_MIME_TYPES;
  const max = mediaType === "digital_file" ? MAX_DIGITAL_FILE_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
  if (!allowed.includes(file.type as never)) return NextResponse.json({ error: "This file type is not allowed." }, { status: 400 });
  if (file.size < 1 || file.size > max) return NextResponse.json({ error: "This file is too large." }, { status: 400 });
  const result = await ProductMediaService.adminUpload(id, { name: file.name, type: file.type, bytes: Buffer.from(await file.arrayBuffer()), mediaType: mediaType === "digital_file" ? "digital_file" : "image", altText: String(form.get("altText") ?? "") || undefined, isPrimary: form.get("isPrimary") === "true" });
  return NextResponse.json(result, { status: 201 });
}
