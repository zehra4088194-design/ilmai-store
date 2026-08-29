/**
 * Non-secret, app-wide configuration constants. Anything here is safe to
 * import from client components. Secrets never live here — see
 * ENVIRONMENT.md and src/lib/supabase/server-admin.ts for those.
 */
export const siteConfig = {
  name: "IlmAI Store",
  url: process.env.NEXT_PUBLIC_STORE_URL ?? "https://ilmai.store",
  ilmaiStudyUrl: process.env.NEXT_PUBLIC_ILMAI_STUDY_URL ?? "https://ilmai.study",
  defaultCurrency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "PKR",
  supportEmail: "ilmai.study1@gmail.com",
};
