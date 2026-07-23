import { z } from "zod";

export const generateAiSummarySchema = z.object({
  processUpdateId: z.string().uuid(),
});

export const approveAiSummarySchema = z.object({
  summaryId: z.string().uuid(),
  plainLanguageSummary: z.string().trim().min(1, "O resumo não pode ficar vazio."),
  classification: z.string().trim().optional().or(z.literal("")),
  possibleDeadline: z.string().trim().optional().or(z.literal("")),
  publishToPortal: z.coerce.boolean(),
});

export const rejectAiSummarySchema = z.object({
  summaryId: z.string().uuid(),
});
