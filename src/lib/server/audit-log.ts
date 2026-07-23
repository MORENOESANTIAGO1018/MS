import "server-only";
import { getSupabaseAdminClient } from "./supabase-admin";
import { redact } from "@/lib/redact";
import { logger } from "@/lib/logger";

interface RecordAuditLogInput {
  actorProfileId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

/**
 * Grava uma linha em audit_logs via service_role. A redacao acontece aqui
 * (defesa 1) e novamente no banco via trigger redact_audit_log_before_insert
 * (defesa 2) — ver SEGURANCA-E-LGPD.md.
 */
export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  const admin = getSupabaseAdminClient();

  const { error } = await admin.from("audit_logs").insert({
    actor_profile_id: input.actorProfileId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before: input.before ? (redact(input.before) as Record<string, unknown>) : null,
    after: input.after ? (redact(input.after) as Record<string, unknown>) : null,
  });

  if (error) {
    logger.error("Falha ao gravar audit_log", {
      error: error.message,
      action: input.action,
      entityType: input.entityType,
    });
  }
}
