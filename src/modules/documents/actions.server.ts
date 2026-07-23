"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scanDocumentBuffer } from "@/lib/server/antivirus";
import { recordAccessLog } from "@/lib/server/access-log";
import { logger } from "@/lib/logger";
import {
  getAllowedMimeTypes,
  getMaxDocumentSizeBytes,
  uploadDocumentMetadataSchema,
} from "./schema";

export interface UploadDocumentResult {
  success: boolean;
  message: string;
}

/**
 * Upload de documento pelo cliente (ou pela equipe). Usa o cliente Supabase
 * no contexto do usuario (RLS de storage.objects + public.documents ja
 * restringem por client_id — ver supabase/migrations/0009_storage.sql).
 * Validacoes de tamanho/extensao/antivirus acontecem antes do upload.
 */
export async function uploadDocument(formData: FormData): Promise<UploadDocumentResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, message: "Selecione um arquivo para enviar." };
  }

  const parsedMeta = uploadDocumentMetadataSchema.safeParse({
    clientId: formData.get("clientId"),
    processId: formData.get("processId") ?? "",
    name: formData.get("name") || file.name,
  });

  if (!parsedMeta.success) {
    return {
      success: false,
      message: parsedMeta.error.issues[0]?.message ?? "Dados inválidos.",
    };
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
    logger.error("Upload bloqueado por resultado de antivirus", { fileName: file.name });
    return {
      success: false,
      message: "O arquivo enviado foi rejeitado pela verificação de segurança.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { clientId, processId, name } = parsedMeta.data;
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `clients/${clientId}/${crypto.randomUUID()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    logger.error("Falha no upload para o Storage", { error: uploadError.message });
    return { success: false, message: "Não foi possível enviar o arquivo." };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    client_id: clientId,
    process_id: processId || null,
    name,
    storage_path: storagePath,
    uploaded_by_role: profile?.role === "client" ? "client" : "staff",
    size_bytes: file.size,
    mime_type: file.type,
  });

  if (insertError) {
    logger.error("Falha ao registrar documento", { error: insertError.message });
    // Tenta remover o arquivo orfao do storage, mas nao falha a resposta por causa disso.
    await supabase.storage.from("documents").remove([storagePath]);
    return { success: false, message: "Não foi possível registrar o documento." };
  }

  await recordAccessLog({
    profileId: user.id,
    clientId,
    action: "document_uploaded",
    resourceType: "documents",
  });

  revalidatePath("/documentos");
  return { success: true, message: "Documento enviado com sucesso." };
}
