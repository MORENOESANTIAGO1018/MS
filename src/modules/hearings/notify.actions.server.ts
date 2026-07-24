"use server";

import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { logger } from "@/lib/logger";

const HEARING_REMINDER_HOURS_AHEAD = 48;

export interface HearingReminderSummary {
  notified: number;
}

/**
 * Job de lembrete de audiência (Fase 11, consumido pelo workflow n8n
 * "05-lembrete-audiencia"). Idempotente via hearings.client_notified — uma
 * audiência só é notificada uma vez, mesmo que o job rode várias vezes por
 * dia.
 */
export async function runHearingReminders(): Promise<HearingReminderSummary> {
  const admin = getSupabaseAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + HEARING_REMINDER_HOURS_AHEAD * 60 * 60 * 1000);

  const { data: hearings, error } = await admin
    .from("hearings")
    .select("id, client_id, title, scheduled_at")
    .eq("client_notified", false)
    .eq("is_visible_to_client", true)
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", windowEnd.toISOString());

  if (error) {
    logger.error("Falha ao buscar audiências para lembrete", { error: error.message });
    return { notified: 0 };
  }

  let notified = 0;
  for (const hearing of hearings ?? []) {
    const { error: updateError } = await admin
      .from("hearings")
      .update({ client_notified: true })
      .eq("id", hearing.id)
      .eq("client_notified", false);
    if (updateError) continue;

    await admin.from("notifications").insert({
      client_id: hearing.client_id,
      title: "Audiência se aproximando",
      body: `A audiência "${hearing.title}" está marcada para ${hearing.scheduled_at}.`,
      category: "audiencia",
    });
    notified += 1;
  }

  return { notified };
}
