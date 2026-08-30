import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * Import this ONLY from:
 *   - src/services/**  after an admin/ownership check has already happened
 *     (e.g. inside PaymentService.handleWebhookEvent, or admin services
 *     behind requireAdmin())
 *   - src/app/api/webhooks/** (webhook payload is verified before this is used)
 *
 * NEVER import this from:
 *   - a route handler directly, before validating the caller
 *   - any "use client" component
 *   - any file under src/components or src/features/**\/ui
 *
 * The `server-only` import above will throw a build error if this file is
 * ever pulled into a client bundle.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_ID_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
