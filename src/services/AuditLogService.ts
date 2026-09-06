import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { logger } from "@/lib/logger";

export type AuditLogEntry = {
  id: string;
  actorId?: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;
const map = (r: Raw): AuditLogEntry => ({ id: r.id, actorId: r.actor_id ?? undefined, actorRole: r.actor_role, action: r.action, entityType: r.entity_type, entityId: r.entity_id ?? undefined, metadata: r.metadata ?? {}, createdAt: r.created_at });

export const AuditLogService = {
  /**
   * Records one admin action for later review — who (actorId/actorRole),
   * what (action), on what (entityType/entityId), plus free-form context
   * (metadata). Called from route handlers right after the mutation they
   * guard succeeds, using the same {userId, role} requireAdmin() already
   * resolved — no service-layer signatures need to change for this.
   *
   * Deliberately swallows its own errors: a logging hiccup must never turn
   * a successful admin action into a failed request.
   */
  async record(entry: { actorId?: string; actorRole: string; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown> }): Promise<void> {
    try {
      const { error } = await createSupabaseAdminClient().from("admin_audit_log").insert({
        actor_id: entry.actorId ?? null,
        actor_role: entry.actorRole,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId ?? null,
        metadata: entry.metadata ?? {},
      });
      if (error) throw new Error(error.message);
    } catch (err) {
      logger.error("audit_log.write_failed", { action: entry.action, entityType: entry.entityType, entityId: entry.entityId, error: String(err) });
    }
  },

  /** Most recent entries first, for the admin audit-log page. */
  async list(limit = 200): Promise<AuditLogEntry[]> {
    const { data, error } = await createSupabaseAdminClient().from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(map);
  },
};
