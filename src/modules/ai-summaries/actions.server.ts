"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClaudeAdapter } from "@/lib/server/claude";
import { notifyN8n } from "@/lib/server/n8n-notify";
import { getClientContact } from "@/lib/server/client-contact";
import { logger } from "@/lib/logger";
import {
  approveAiSummarySchema,
  generateAiSummarySchema,
  rejectAiSummarySchema,
} from "./schema";

export interface ActionResult {
  success: boolean;
  message: string;
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

/**
 * Gera uma sugestão de resumo via Claude para um andamento já registrado
 * (que precisa ter `original_text` preenchido). O resultado é sempre gravado
 * com status "pending_review" em ai_summaries — a IA nunca publica nada
 * sozinha (regra inegociável #10). Um advogado/staff precisa revisar e
 * aprovar explicitamente em /admin/resumos-ia antes de qualquer publicação.
 */
export async function generateAiSummary(processUpdateId: string): Promise<ActionResult> {
  const parsed = generateAiSummarySchema.safeParse({ processUpdateId });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();

  const { data: update } = await supabase
    .from("process_updates")
    .select("id, process_id, client_id, original_text")
    .eq("id", parsed.data.processUpdateId)
    .maybeSingle();

  if (!update) {
    return { success: false, message: "Andamento não encontrado ou sem permissão de acesso." };
  }
  if (!update.original_text) {
    return {
      success: false,
      message: "Este andamento não tem texto original cadastrado para resumir.",
    };
  }

  const { data: process } = await supabase
    .from("processes")
    .select("process_number, practice_area")
    .eq("id", update.process_id)
    .maybeSingle();

  try {
    const adapter = getClaudeAdapter();
    const result = await adapter.summarizeProcessUpdate({
      originalText: update.original_text,
      processNumber: process?.process_number ?? "",
      practiceArea: process?.practice_area ?? null,
    });

    const { error } = await supabase.from("ai_summaries").insert({
      process_update_id: update.id,
      client_id: update.client_id,
      model: result.model,
      model_version: result.modelVersion,
      prompt_version: result.promptVersion,
      technical_summary: result.technicalSummary,
      plain_language_summary: result.plainLanguageSummary,
      classification: result.classification,
      possible_deadline: result.possibleDeadline,
      sensitive_flags: result.sensitiveFlags,
    });

    if (error) {
      logger.error("Falha ao gravar sugestão de resumo de IA", { error: error.message });
      return { success: false, message: "Não foi possível salvar a sugestão de resumo." };
    }

    revalidatePath("/admin/resumos-ia");
    return { success: true, message: "Resumo sugerido gerado. Revise em Resumos por IA." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Falha ao gerar resumo com IA", { error: message });
    return { success: false, message: "A IA não conseguiu gerar um resumo. Tente novamente." };
  }
}

/**
 * Ato humano explícito de aprovação (regra inegociável #10): copia o texto
 * (possivelmente editado pelo revisor) para process_updates e só marca
 * is_visible_to_client=true se o revisor marcar "publicar" explicitamente.
 */
export async function approveAiSummary(formData: FormData): Promise<ActionResult> {
  const parsed = approveAiSummarySchema.safeParse({
    summaryId: formData.get("summaryId"),
    plainLanguageSummary: formData.get("plainLanguageSummary"),
    classification: formData.get("classification"),
    possibleDeadline: formData.get("possibleDeadline"),
    publishToPortal: formData.get("publishToPortal") === "on",
  });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const { data: summary } = await supabase
    .from("ai_summaries")
    .select(
      "id, process_update_id, client_id, plain_language_summary, classification, possible_deadline, status",
    )
    .eq("id", parsed.data.summaryId)
    .maybeSingle();

  if (!summary) {
    return { success: false, message: "Sugestão de resumo não encontrada." };
  }
  if (summary.status !== "pending_review") {
    return { success: false, message: "Esta sugestão já foi revisada." };
  }

  const { plainLanguageSummary, publishToPortal } = parsed.data;
  const classification = parsed.data.classification || null;
  const possibleDeadline = parsed.data.possibleDeadline || null;

  const wasEdited =
    plainLanguageSummary !== summary.plain_language_summary ||
    classification !== summary.classification ||
    possibleDeadline !== summary.possible_deadline;

  const nowIso = new Date().toISOString();

  const { error: summaryError } = await supabase
    .from("ai_summaries")
    .update({
      plain_language_summary: plainLanguageSummary,
      classification,
      possible_deadline: possibleDeadline,
      status: wasEdited ? "edited" : "approved",
      reviewed_by: user.id,
      reviewed_at: nowIso,
    })
    .eq("id", summary.id);

  if (summaryError) {
    logger.error("Falha ao aprovar resumo de IA", { error: summaryError.message });
    return { success: false, message: "Não foi possível registrar a aprovação." };
  }

  const { error: updateError } = await supabase
    .from("process_updates")
    .update({
      plain_language_summary: plainLanguageSummary,
      classification,
      possible_deadline: possibleDeadline,
      reviewed_by_lawyer: true,
      is_visible_to_client: publishToPortal,
      published_at: publishToPortal ? nowIso : null,
      updated_by: user.id,
    })
    .eq("id", summary.process_update_id);

  if (updateError) {
    logger.error("Falha ao aplicar resumo aprovado ao andamento", { error: updateError.message });
    return {
      success: false,
      message: "Resumo aprovado, mas houve falha ao atualizar o andamento. Verifique manualmente.",
    };
  }

  if (publishToPortal) {
    const contact = await getClientContact(summary.client_id);
    await notifyN8n("andamento-publicado", {
      processUpdateId: summary.process_update_id,
      clientId: summary.client_id,
      clientEmail: contact?.email ?? null,
      clientName: contact?.fullName ?? null,
    });
  }

  revalidatePath("/admin/resumos-ia");
  revalidatePath("/admin/andamentos");
  revalidatePath("/andamentos");
  return {
    success: true,
    message: publishToPortal ? "Resumo aprovado e publicado no portal." : "Resumo aprovado (não publicado).",
  };
}

export async function rejectAiSummary(formData: FormData): Promise<ActionResult> {
  const parsed = rejectAiSummarySchema.safeParse({ summaryId: formData.get("summaryId") });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const { error } = await supabase
    .from("ai_summaries")
    .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", parsed.data.summaryId)
    .eq("status", "pending_review");

  if (error) {
    logger.error("Falha ao rejeitar resumo de IA", { error: error.message });
    return { success: false, message: "Não foi possível rejeitar a sugestão." };
  }

  revalidatePath("/admin/resumos-ia");
  return { success: true, message: "Sugestão rejeitada." };
}
