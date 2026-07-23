"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scanDocumentBuffer } from "@/lib/server/antivirus";
import { recordAccessLog } from "@/lib/server/access-log";
import { logger } from "@/lib/logger";
import { getAllowedMimeTypes, getMaxDocumentSizeBytes } from "@/modules/documents/schema";
import { uploadReceiptMetadataSchema } from "./schema";

export interface ActionResult {
  success: boolean;
  message: string;
}

/**
 * Anexa um comprovante de pagamento a um lançamento financeiro existente.
 * Reaproveita o mesmo bucket privado de documentos (nunca público), sob o
 * prefixo clients/<client_id>/receipts/, e a mesma verificação de
 * tamanho/tipo/antivírus do upload de documentos (Fase 9).
 */
export async function attachReceiptToFinancialEntry(formData: FormData): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, message: "Selecione um arquivo para enviar." };
  }

  const parsed = uploadReceiptMetadataSchema.safeParse({
    financialEntryId: formData.get("financialEntryId"),
    clientId: formData.get("clientId"),
  });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const maxSize = getMaxDocumentSizeBytes();
  if (file.size > maxSize) {
    return {
      success: false,
      message: `Arquivo muito grande. O limite é ${Math.floor(maxSize / (1024 * 1024))}MB.`,
    };
  }

  const allowedTypes = getAllowedMimeTypes();
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      message: "Tipo de arquivo não permitido. Envie PDF, imagem ou documento do Word.",
    };
  }

  const buffer = await file.arrayBuffer();
  const scan = await scanDocumentBuffer(buffer, file.name);
  if (!scan.clean) {
    logger.error("Upload de comprovante bloqueado por resultado de antivirus", {
      fileName: file.name,
    });
    return {
      success: false,
      message: "O arquivo enviado foi rejeitado pela verificação de segurança.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Sessão expirada. Faça login novamente." };

  const { financialEntryId, clientId } = parsed.data;
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `clients/${clientId}/receipts/${crypto.randomUUID()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    logger.error("Falha no upload do comprovante para o Storage", { error: uploadError.message });
    return { success: false, message: "Não foi possível enviar o comprovante." };
  }

  const { error: updateError } = await supabase
    .from("financial_entries")
    .update({ receipt_storage_path: storagePath })
    .eq("id", financialEntryId);

  if (updateError) {
    logger.error("Falha ao registrar comprovante no lançamento financeiro", {
      error: updateError.message,
    });
    await supabase.storage.from("documents").remove([storagePath]);
    return { success: false, message: "Não foi possível registrar o comprovante." };
  }

  await recordAccessLog({
    profileId: user.id,
    clientId,
    action: "receipt_uploaded",
    resourceType: "financial_entries",
    resourceId: financialEntryId,
  });

  revalidatePath("/admin/financeiro");
  revalidatePath("/financeiro");
  return { success: true, message: "Comprovante anexado com sucesso." };
}
