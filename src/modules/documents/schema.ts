import { z } from "zod";
import { getServerEnv } from "@/lib/env";

export function getAllowedMimeTypes(): string[] {
  return getServerEnv()
    .ALLOWED_DOCUMENT_MIME_TYPES.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getMaxDocumentSizeBytes(): number {
  return getServerEnv().MAX_DOCUMENT_SIZE_MB * 1024 * 1024;
}

export const DOCUMENT_CATEGORIES = [
  "Documento pessoal",
  "Comprovante de residência",
  "Procuração",
  "Contrato",
  "Petição",
  "Decisão judicial",
  "Comprovante financeiro",
  "Outro",
] as const;

export const uploadDocumentMetadataSchema = z.object({
  clientId: z.string().uuid(),
  processId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Informe um nome para o documento.").max(200),
  category: z.string().trim().max(80).optional().or(z.literal("")),
});

/**
 * Upload feito pela equipe (staff/admin) diretamente na pasta do cliente —
 * diferente do upload do cliente, aqui a equipe decide explicitamente se o
 * documento é sigiloso e se já deve ficar visível no portal (regra
 * inegociável: nada fica visível ao cliente sem uma decisão humana explícita).
 */
export const staffUploadDocumentMetadataSchema = uploadDocumentMetadataSchema.extend({
  isConfidential: z.coerce.boolean(),
  publishToPortal: z.coerce.boolean(),
});
