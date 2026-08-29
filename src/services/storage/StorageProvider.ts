/**
 * Provider-agnostic object storage interface, currently backed by
 * Backblaze B2 (S3-compatible). See CLAUDE_CONTEXT.md §8 for what belongs
 * in storage vs. what never should.
 */

export interface UploadInput {
  key: string;
  body: Uint8Array | Buffer;
  contentType: string;
  /** true = product images/media served publicly; false = private digital files */
  isPublic: boolean;
}

export interface StorageObjectMetadata {
  key: string;
  sizeBytes: number;
  contentType: string;
  lastModified: string;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<{ key: string }>;
  delete(key: string): Promise<void>;
  getMetadata(key: string): Promise<StorageObjectMetadata>;
  /** Never used for public media — only for private digital deliverables. */
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
  /** For public media only (product images). */
  getPublicUrl(key: string): string;
}
