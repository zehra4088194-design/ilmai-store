export const AD_REFERRAL_COOKIE = "ilmai_ad_ref";
export const AD_REFERRAL_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const AD_REFERRAL_MAX_LENGTH = 512;

/** Keep opaque referral IDs bounded and ignore missing/blank values. */
export function normalizeAdReferral(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > AD_REFERRAL_MAX_LENGTH) return undefined;
  return normalized;
}
