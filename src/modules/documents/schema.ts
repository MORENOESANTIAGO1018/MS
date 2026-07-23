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

export const uploadDocumentMetadataSchema = z.object({
  clientId: z.string().uuid(),
  processId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Informe um nome para o documento.").max(200),
});
