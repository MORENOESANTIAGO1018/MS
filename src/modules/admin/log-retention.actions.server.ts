"use server";

import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface LogPurgeSummary {
  cutoff: string;
  accessLogsDeleted: number;
  auditLogsDeleted: number;
}

/**
 * Expurga access_logs/audit_logs mais antigos que AUDIT_LOG_RETENTION_DAYS
 * (Fase 11 + Fase 13, workflow n8n "12-purga-logs-antigos"). Roda com o
 * cliente admin porque essas tabelas não têm policy de DELETE para
 * authenticated (só INSERT via service_role e SELECT por admin).
 */
export async function purgeOldLogs(): Promise<LogPurgeSummary> {
  const admin = getSupabaseAdminClient();
  const env = getServerEnv();

  const cutoff = new Date(Date.now() - env.AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();

  const { error: accessError, count: accessCount } = await admin
    .from("access_logs")
    .delete({ count: "exact" })
    .lt("created_at", cutoffIso);

  if (accessError) {
    logger.error("Falha ao expurgar access_logs", { error: accessError.message });
  }

  const { error: auditError, count: auditCount } = await admin
    .from("audit_logs")
    .delete({ count: "exact" })
    .lt("created_at", cutoffIso);

  if (auditError) {
    logger.error("Falha ao expurgar audit_logs", { error: auditError.message });
  }

  return {
    cutoff: cutoffIso,
    accessLogsDeleted: accessCount ?? 0,
    auditLogsDeleted: auditCount ?? 0,
  };
}
