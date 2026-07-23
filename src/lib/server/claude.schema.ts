import { z } from "zod";

/**
 * Contrato de saida estruturada da IA. Compartilhado entre o adaptador
 * (validacao da resposta bruta do modelo) e o modulo ai-summaries (validacao
 * antes de persistir). Ver FASE 10 do prompt original: saida estruturada,
 * sem afirmacao de resultado, sem garantia, sinalizacao de dados sensiveis.
 */
export const claudeSummaryOutputSchema = z.object({
  technicalSummary: z.string().min(1).max(4000),
  plainLanguageSummary: z.string().min(1).max(2000),
  classification: z.string().min(1).max(80),
  possibleDeadline: z.string().date().nullable(),
  suggestedProvidence: z.string().max(1000).nullable(),
  sensitiveFlags: z.array(z.string()).default([]),
});

export type ClaudeSummaryOutputPayload = z.infer<typeof claudeSummaryOutputSchema>;
