import "server-only";
import { createHash } from "node:crypto";
import { getSupabaseAdminClient } from "./supabase-admin";
import { logger } from "@/lib/logger";

interface RecordAccessLogInput {
  profileId: string | null;
  clientId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Grava uma linha em access_logs via service_role (a tabela nao tem policy
 * de INSERT para authenticated — apenas leitura por admin). IP e armazenado
 * como hash (nunca em claro), conforme SEGURANCA-E-LGPD.md.
 */
export async function recordAccessLog(input: RecordAccessLogInput): Promise<void> {
  const admin = getSupabaseAdminClient();
  const ipHash = input.ip
    ? createHash("sha256").update(input.ip).digest("hex")
    : null;

  const { error } = await admin.from("access_logs").insert({
    profile_id: input.profileId,
    client_id: input.clientId ?? null,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    ip_hash: ipHash,
    user_agent: input.userAgent ?? null,
  });

  if (error) {
    // Falha ao logar nao deve derrubar a operacao principal, mas precisa
    // ficar visivel para investigacao.
    logger.error("Falha ao gravar access_log", {
      error: error.message,
      action: input.action,
      resourceType: input.resourceType,
    });
  }
}
