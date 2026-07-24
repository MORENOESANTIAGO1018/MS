"use server";

import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { logger } from "@/lib/logger";

export interface AiSummaryDigestSummary {
  pendingCount: number;
  notified: boolean;
}

/**
 * Alerta diário para a equipe quando há resumos de IA aguardando revisão
 * (Fase 11, workflow n8n "09-alerta-resumo-ia-pendente"). Gera no máximo uma
 * notificação por dia (idempotente por data), mesmo que o job rode várias
 * vezes — evita spam quando a fila de revisão fica parada por dias.
 * client_id/profile_id nulos == notificação de âmbito interno, visível
 * apenas a admins (ver policy notifications_select).
 */
export async function runAiSummaryDigest(): Promise<AiSummaryDigestSummary> {
  const admin = getSupabaseAdminClient();

  const { count, error: countError } = await admin
    .from("ai_summaries")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review");

  if (countError) {
    logger.error("Falha ao contar resumos de IA pendentes", { error: countError.message });
    return { pendingCount: 0, notified: false };
  }

  const pendingCount = count ?? 0;
  if (pendingCount === 0) {
    return { pendingCount: 0, notified: false };
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count: alreadyNotifiedToday } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("category", "ia_pendente")
    .gte("created_at", todayStart.toISOString());

  if ((alreadyNotifiedToday ?? 0) > 0) {
    return { pendingCount, notified: false };
  }

  await admin.from("notifications").insert({
    client_id: null,
    profile_id: null,
    title: "Resumos de IA aguardando revisão",
    body: `Há ${pendingCount} resumo(s) sugerido(s) pela IA aguardando revisão humana em /admin/resumos-ia.`,
    category: "ia_pendente",
  });

  return { pendingCount, notified: true };
}
