"use server";

import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { logger } from "@/lib/logger";

const DEADLINE_REMINDER_DAYS_AHEAD = 3;

export interface DeadlineReminderSummary {
  notified: number;
}

/**
 * Job de lembrete de prazo processual (Fase 11, workflow n8n
 * "06-lembrete-prazo"). Idempotente via deadlines.client_notified (migration
 * 0010) — o mesmo prazo nunca gera duas notificações.
 */
export async function runDeadlineReminders(): Promise<DeadlineReminderSummary> {
  const admin = getSupabaseAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + DEADLINE_REMINDER_DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const { data: deadlines, error } = await admin
    .from("deadlines")
    .select("id, client_id, description, due_date")
    .eq("client_notified", false)
    .eq("is_visible_to_client", true)
    .neq("status", "Concluído")
    .gte("due_date", now.toISOString().slice(0, 10))
    .lte("due_date", windowEnd.toISOString().slice(0, 10));

  if (error) {
    logger.error("Falha ao buscar prazos para lembrete", { error: error.message });
    return { notified: 0 };
  }

  let notified = 0;
  for (const deadline of deadlines ?? []) {
    const { error: updateError } = await admin
      .from("deadlines")
      .update({ client_notified: true })
      .eq("id", deadline.id)
      .eq("client_notified", false);
    if (updateError) continue;

    await admin.from("notifications").insert({
      client_id: deadline.client_id,
      title: "Prazo se aproximando",
      body: `O prazo "${deadline.description}" vence em ${deadline.due_date}.`,
      category: "prazo",
    });
    notified += 1;
  }

  return { notified };
}
