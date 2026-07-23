"use server";

import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { logger } from "@/lib/logger";

const DUE_SOON_DAYS = 3;

export interface PaymentDueNotificationSummary {
  markedDueSoon: number;
  markedOverdue: number;
}

/**
 * Job de notificação de vencimento (Fase 8, integrado ao workflow n8n da
 * Fase 11 via app/api/notifications/payment-due). Usa o cliente admin
 * (service_role) porque roda sem sessão de usuário — nenhum humano está
 * "logado" quando o n8n dispara isso.
 *
 * Idempotente por construção: só cria uma notificação quando o status do
 * lançamento realmente muda (pendente -> a_vencer -> vencido). Rodar este
 * job várias vezes no mesmo dia não duplica notificações, porque a segunda
 * execução não encontra mais linhas com o status antigo para transicionar.
 */
export async function runPaymentDueNotifications(): Promise<PaymentDueNotificationSummary> {
  const admin = getSupabaseAdminClient();
  const today = new Date();
  const dueSoonThreshold = new Date(today.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);
  const todayIso = today.toISOString().slice(0, 10);
  const dueSoonIso = dueSoonThreshold.toISOString().slice(0, 10);

  let markedDueSoon = 0;
  let markedOverdue = 0;

  const { data: dueSoonEntries, error: dueSoonError } = await admin
    .from("financial_entries")
    .select("id, client_id, description, due_date")
    .eq("status", "pendente")
    .eq("is_visible_to_client", true)
    .gte("due_date", todayIso)
    .lte("due_date", dueSoonIso);

  if (dueSoonError) {
    logger.error("Falha ao buscar lançamentos a vencer", { error: dueSoonError.message });
  } else {
    for (const entry of dueSoonEntries ?? []) {
      const { error: updateError } = await admin
        .from("financial_entries")
        .update({ status: "a_vencer" })
        .eq("id", entry.id)
        .eq("status", "pendente");
      if (updateError) continue;

      await admin.from("notifications").insert({
        client_id: entry.client_id,
        title: "Vencimento próximo",
        body: `O lançamento "${entry.description}" vence em ${entry.due_date}.`,
        category: "financeiro",
      });
      markedDueSoon += 1;
    }
  }

  const { data: overdueEntries, error: overdueError } = await admin
    .from("financial_entries")
    .select("id, client_id, description, due_date")
    .in("status", ["pendente", "a_vencer"])
    .eq("is_visible_to_client", true)
    .lt("due_date", todayIso);

  if (overdueError) {
    logger.error("Falha ao buscar lançamentos vencidos", { error: overdueError.message });
  } else {
    for (const entry of overdueEntries ?? []) {
      const { error: updateError } = await admin
        .from("financial_entries")
        .update({ status: "vencido" })
        .eq("id", entry.id)
        .in("status", ["pendente", "a_vencer"]);
      if (updateError) continue;

      await admin.from("notifications").insert({
        client_id: entry.client_id,
        title: "Pagamento em atraso",
        body: `O lançamento "${entry.description}" venceu em ${entry.due_date} e ainda consta pendente.`,
        category: "financeiro",
      });
      markedOverdue += 1;
    }
  }

  return { markedDueSoon, markedOverdue };
}
