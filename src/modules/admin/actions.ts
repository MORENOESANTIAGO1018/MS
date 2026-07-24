"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assignStaffSchema,
  createClientSchema,
  createContractSchema,
  createDeadlineSchema,
  createFinancialEntrySchema,
  createHearingSchema,
  createProcessSchema,
  createProcessUpdateSchema,
  toggleDocumentVisibilitySchema,
  updateFinancialStatusSchema,
  updateProcessSchema,
} from "./schema";

export interface ActionResult {
  success: boolean;
  message: string;
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

export async function createClient(formData: FormData): Promise<ActionResult> {
  const parsed = createClientSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    practiceArea: formData.get("practiceArea"),
    internalCode: formData.get("internalCode"),
  });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { fullName, email, phone, whatsapp, practiceArea, internalCode } = parsed.data;

  const { error } = await supabase.from("clients").insert({
    full_name: fullName,
    email: email || null,
    phone: phone || null,
    whatsapp: whatsapp || null,
    status: "Lead",
    internal_code: internalCode || null,
  });

  if (error) return { success: false, message: "Não foi possível criar o cliente." };
  void practiceArea; // reservado: hoje a area juridica vive em `processes`, nao em `clients`

  revalidatePath("/admin/clientes");
  return { success: true, message: "Cliente criado com sucesso." };
}

export async function createProcess(formData: FormData): Promise<ActionResult> {
  const parsed = createProcessSchema.safeParse({
    clientId: formData.get("clientId"),
    processNumber: formData.get("processNumber"),
    court: formData.get("court"),
    practiceArea: formData.get("practiceArea"),
    phase: formData.get("phase"),
    clientSummary: formData.get("clientSummary"),
  });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("processes").insert({
    client_id: parsed.data.clientId,
    process_number: parsed.data.processNumber,
    court: parsed.data.court || null,
    practice_area: parsed.data.practiceArea || null,
    phase: parsed.data.phase || "Análise inicial",
    status: "Ativo",
    client_summary: parsed.data.clientSummary || null,
  });

  if (error) return { success: false, message: "Não foi possível criar o processo." };
  revalidatePath("/admin/processos");
  return { success: true, message: "Processo criado com sucesso." };
}

export async function updateProcess(formData: FormData): Promise<ActionResult> {
  const parsed = updateProcessSchema.safeParse({
    processId: formData.get("processId"),
    phase: formData.get("phase"),
    status: formData.get("status"),
    clientSummary: formData.get("clientSummary"),
    isVisibleToClient: formData.get("isVisibleToClient") === "on",
  });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("processes")
    .update({
      phase: parsed.data.phase,
      status: parsed.data.status,
      client_summary: parsed.data.clientSummary || null,
      is_visible_to_client: parsed.data.isVisibleToClient,
    })
    .eq("id", parsed.data.processId);

  if (error) return { success: false, message: "Não foi possível atualizar o processo." };
  revalidatePath("/admin/processos");
  return { success: true, message: "Processo atualizado." };
}

/** Publica um andamento no portal — ato humano explícito (regra inegociável #10). */
export async function createProcessUpdate(formData: FormData): Promise<ActionResult> {
  const parsed = createProcessUpdateSchema.safeParse({
    processId: formData.get("processId"),
    clientId: formData.get("clientId"),
    updateDate: formData.get("updateDate"),
    plainLanguageSummary: formData.get("plainLanguageSummary"),
    classification: formData.get("classification"),
    originalText: formData.get("originalText"),
    publishToPortal: formData.get("publishToPortal") === "on",
  });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { publishToPortal } = parsed.data;

  const { error } = await supabase.from("process_updates").insert({
    process_id: parsed.data.processId,
    client_id: parsed.data.clientId,
    update_date: parsed.data.updateDate,
    plain_language_summary: parsed.data.plainLanguageSummary,
    classification: parsed.data.classification || null,
    original_text: parsed.data.originalText || null,
    reviewed_by_lawyer: true,
    is_visible_to_client: publishToPortal,
    published_at: publishToPortal ? new Date().toISOString() : null,
  });

  if (error) return { success: false, message: "Não foi possível registrar o andamento." };
  revalidatePath("/admin/andamentos");
  revalidatePath("/andamentos");
  return { success: true, message: "Andamento registrado." };
}

export async function createHearing(formData: FormData): Promise<ActionResult> {
  const parsed = createHearingSchema.safeParse({
    processId: formData.get("processId"),
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    scheduledAt: formData.get("scheduledAt"),
    modality: formData.get("modality"),
    location: formData.get("location"),
    publishToPortal: formData.get("publishToPortal") === "on",
  });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("hearings").insert({
    process_id: parsed.data.processId,
    client_id: parsed.data.clientId,
    title: parsed.data.title,
    scheduled_at: parsed.data.scheduledAt,
    modality: parsed.data.modality || null,
    location: parsed.data.location || null,
    status: "Agendada",
    is_visible_to_client: parsed.data.publishToPortal,
  });

  if (error) return { success: false, message: "Não foi possível criar a audiência." };
  revalidatePath("/admin/audiencias");
  return { success: true, message: "Audiência criada." };
}

export async function createDeadline(formData: FormData): Promise<ActionResult> {
  const parsed = createDeadlineSchema.safeParse({
    processId: formData.get("processId"),
    clientId: formData.get("clientId"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
    priority: formData.get("priority"),
    publishToPortal: formData.get("publishToPortal") === "on",
  });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("deadlines").insert({
    process_id: parsed.data.processId,
    client_id: parsed.data.clientId,
    description: parsed.data.description,
    due_date: parsed.data.dueDate,
    priority: parsed.data.priority || "Média",
    status: "Em aberto",
    is_visible_to_client: parsed.data.publishToPortal,
  });

  if (error) return { success: false, message: "Não foi possível criar o prazo." };
  revalidatePath("/admin/prazos");
  return { success: true, message: "Prazo criado." };
}

export async function createContract(formData: FormData): Promise<ActionResult> {
  const parsed = createContractSchema.safeParse({
    clientId: formData.get("clientId"),
    processId: formData.get("processId"),
    contractNumber: formData.get("contractNumber"),
    serviceType: formData.get("serviceType"),
    totalValue: formData.get("totalValue"),
    publishToPortal: formData.get("publishToPortal") === "on",
  });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("contracts").insert({
    client_id: parsed.data.clientId,
    process_id: parsed.data.processId || null,
    contract_number: parsed.data.contractNumber,
    service_type: parsed.data.serviceType || null,
    total_value: parsed.data.totalValue ?? null,
    status: "Em elaboração",
    is_visible_to_client: parsed.data.publishToPortal,
  });

  if (error) return { success: false, message: "Não foi possível criar o contrato." };
  revalidatePath("/admin/contratos");
  return { success: true, message: "Contrato criado." };
}

export async function createFinancialEntry(formData: FormData): Promise<ActionResult> {
  const parsed = createFinancialEntrySchema.safeParse({
    clientId: formData.get("clientId"),
    contractId: formData.get("contractId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
    publishToPortal: formData.get("publishToPortal") === "on",
  });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("financial_entries").insert({
    client_id: parsed.data.clientId,
    contract_id: parsed.data.contractId || null,
    description: parsed.data.description,
    amount: parsed.data.amount,
    due_date: parsed.data.dueDate,
    status: "pendente",
    is_visible_to_client: parsed.data.publishToPortal,
  });

  if (error) return { success: false, message: "Não foi possível criar o lançamento." };
  revalidatePath("/admin/financeiro");
  return { success: true, message: "Lançamento financeiro criado." };
}

export async function updateFinancialStatus(formData: FormData): Promise<ActionResult> {
  const parsed = updateFinancialStatusSchema.safeParse({
    entryId: formData.get("entryId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const paidAt = parsed.data.status === "pago" ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("financial_entries")
    .update({ status: parsed.data.status, paid_at: paidAt })
    .eq("id", parsed.data.entryId);

  if (error) return { success: false, message: "Não foi possível atualizar a situação." };
  revalidatePath("/admin/financeiro");
  return { success: true, message: "Situação financeira atualizada." };
}

export async function toggleDocumentVisibility(formData: FormData): Promise<ActionResult> {
  const parsed = toggleDocumentVisibilitySchema.safeParse({
    documentId: formData.get("documentId"),
    isVisibleToClient: formData.get("isVisibleToClient") === "on",
    reviewed: formData.get("reviewed") === "on",
    isConfidential: formData.get("isConfidential") === "on",
  });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  if (parsed.data.isConfidential && parsed.data.isVisibleToClient) {
    return {
      success: false,
      message: "Um documento sigiloso não pode ficar visível ao cliente ao mesmo tempo.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("documents")
    .update({
      is_visible_to_client: parsed.data.isVisibleToClient,
      reviewed: parsed.data.reviewed,
      is_confidential: parsed.data.isConfidential,
    })
    .eq("id", parsed.data.documentId);

  if (error) return { success: false, message: "Não foi possível atualizar o documento." };
  revalidatePath("/admin/documentos");
  return { success: true, message: "Documento atualizado." };
}

export async function assignStaffToClient(formData: FormData): Promise<ActionResult> {
  const parsed = assignStaffSchema.safeParse({
    profileId: formData.get("profileId"),
    clientId: formData.get("clientId"),
  });
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("client_access").insert({
    profile_id: parsed.data.profileId,
    client_id: parsed.data.clientId,
    access_level: "staff",
    is_active: true,
  });

  if (error) return { success: false, message: "Não foi possível atribuir o responsável." };
  revalidatePath("/admin/permissoes");
  return { success: true, message: "Responsável atribuído." };
}

export async function revokeStaffAssignment(clientAccessId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_access")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("id", clientAccessId);

  if (error) return { success: false, message: "Não foi possível revogar o acesso." };
  revalidatePath("/admin/permissoes");
  return { success: true, message: "Acesso revogado." };
}
