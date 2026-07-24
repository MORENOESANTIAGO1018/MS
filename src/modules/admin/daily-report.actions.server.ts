"use server";

import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { logger } from "@/lib/logger";

export interface DailyReportPayload {
  generatedAt: string;
  totalClients: number;
  activeClients: number;
  totalProcesses: number;
  activeProcesses: number;
  upcomingDeadlines: number;
  upcomingHearings: number;
  overdueFinancial: number;
  pendingDocuments: number;
  pendingAiSummaries: number;
}

/**
 * Monta o payload do relatório diário (Fase 11, workflow n8n
 * "11-relatorio-diario-admin"), que o n8n formata em e-mail para a equipe.
 * Usa o cliente admin (service_role) porque roda sem sessão de usuário —
 * mesmos indicadores de getDashboardStats (Fase 6), mas essa versão não
 * depende de RLS/cookies.
 */
export async function buildDailyReportPayload(): Promise<DailyReportPayload> {
  const admin = getSupabaseAdminClient();

  const [clients, processes, deadlines, hearings, financial, documents, pendingAi] =
    await Promise.all([
      admin.from("clients").select("id, status", { count: "exact" }),
      admin.from("processes").select("id, status", { count: "exact" }),
      admin.from("deadlines").select("id, due_date, status"),
      admin.from("hearings").select("id, scheduled_at, status"),
      admin.from("financial_entries").select("id, status, amount"),
      admin.from("documents").select("id, reviewed"),
      admin.from("ai_summaries").select("id", { count: "exact" }).eq("status", "pending_review"),
    ]);

  for (const result of [clients, processes, financial, documents, pendingAi]) {
    if (result.error) {
      logger.error("Falha ao montar relatório diário", { error: result.error.message });
    }
  }

  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    generatedAt: now.toISOString(),
    totalClients: clients.count ?? 0,
    activeClients: (clients.data ?? []).filter((c) => c.status === "Cliente ativo").length,
    totalProcesses: processes.count ?? 0,
    activeProcesses: (processes.data ?? []).filter((p) => p.status === "Ativo").length,
    upcomingDeadlines: (deadlines.data ?? []).filter(
      (d) => d.status !== "Concluído" && new Date(d.due_date) <= in7days,
    ).length,
    upcomingHearings: (hearings.data ?? []).filter(
      (h) => new Date(h.scheduled_at) >= now && new Date(h.scheduled_at) <= in7days,
    ).length,
    overdueFinancial: (financial.data ?? []).filter((f) => f.status === "vencido").length,
    pendingDocuments: (documents.data ?? []).filter((d) => !d.reviewed).length,
    pendingAiSummaries: pendingAi.count ?? 0,
  };
}
