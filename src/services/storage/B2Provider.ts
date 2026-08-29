import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageError } from "@/lib/errors";
import type {
  StorageProvider,
  UploadInput,
  StorageObjectMetadata,
} from "./StorageProvider";

/**
 * Backblaze B2 implementation of StorageProvider via the S3-compatible API
 * (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`).
 *
 * Uses the actual S3Client configured with B2_* env vars.
 * each method. The contract and security boundary (private vs public
 * prefix, signed URLs only for private) are fixed — see SECURITY.md §4.
 */
export class B2Provider implements StorageProvider {
  private readonly endpoint = process.env.B2_ENDPOINT!;
  private readonly region = process.env.B2_REGION!;
  private readonly bucket = process.env.B2_BUCKET_NAME!;
  private readonly publicPrefix = process.env.B2_PUBLIC_MEDIA_PREFIX ?? "media/";
  private readonly privatePrefix =
    process.env.B2_PRIVATE_DOWNLOADS_PREFIX ?? "private/";
  private readonly client = new S3Client({ endpoint: this.endpoint, region: this.region, credentials: { accessKeyId: process.env.B2_ACCESS_KEY_ID!, secretAccessKey: process.env.B2_SECRET_ACCESS_KEY! } });

  async upload(input: UploadInput): Promise<{ key: string }> {
    if (!this.bucket || !process.env.B2_ACCESS_KEY_ID || !process.env.B2_SECRET_ACCESS_KEY) throw new StorageError("B2 storage is not configured.");
    const prefix = input.isPublic ? this.publicPrefix : this.privatePrefix;
    const key = input.key.startsWith(prefix) ? input.key : `${prefix}${input.key}`;
    try { await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: input.body, ContentType: input.contentType })); return { key }; } catch (error) { throw new StorageError("File upload failed.", error); }
  }

  async delete(key: string): Promise<void> {
    try { await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })); } catch (error) { throw new StorageError("File deletion failed.", error); }
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata> {
    try { const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key })); return { key, sizeBytes: result.ContentLength ?? 0, contentType: result.ContentType ?? "application/octet-stream", lastModified: (result.LastModified ?? new Date()).toISOString() }; } catch (error) { throw new StorageError("File metadata lookup failed.", error); }
  }

  async getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    if (!key.startsWith(this.privatePrefix)) throw new StorageError("Only private files can receive download URLs.");
    try { return await getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: Math.min(Math.max(ttlSeconds, 60), 900) }); } catch (error) { throw new StorageError("Download URL generation failed.", error); }
  }

  getPublicUrl(key: string): string {
    if (!key.startsWith(this.publicPrefix)) throw new StorageError("Only public media can receive public URLs.");
    return `${this.endpoint.replace(/\/$/, "")}/${this.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
}
