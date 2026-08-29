export const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_DIGITAL_FILE_UPLOAD_BYTES = 500 * 1024 * 1024; // 500MB

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const ALLOWED_DIGITAL_FILE_MIME_TYPES = [
  "application/pdf",
  "application/zip",
  "video/mp4",
  "application/epub+zip",
] as const;

export const MAX_PAYMENT_PROOF_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_PAYMENT_PROOF_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

/** Minutes a signed digital-download URL stays valid for. See SECURITY.md §4. */
export const SIGNED_DOWNLOAD_URL_TTL_MINUTES = 10;
