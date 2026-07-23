import { z } from "zod";

export const createClientSchema = z.object({
  fullName: z.string().trim().min(1, "Informe o nome completo."),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  whatsapp: z.string().trim().optional().or(z.literal("")),
  practiceArea: z.string().trim().min(1, "Informe a área jurídica."),
  internalCode: z.string().trim().optional().or(z.literal("")),
});

export const createProcessSchema = z.object({
  clientId: z.string().uuid(),
  processNumber: z.string().trim().min(1, "Informe o número do processo."),
  court: z.string().trim().optional().or(z.literal("")),
  practiceArea: z.string().trim().optional().or(z.literal("")),
  phase: z.string().trim().optional().or(z.literal("")),
  clientSummary: z.string().trim().optional().or(z.literal("")),
});

export const updateProcessSchema = z.object({
  processId: z.string().uuid(),
  phase: z.string().trim().min(1),
  status: z.string().trim().min(1),
  clientSummary: z.string().trim().optional().or(z.literal("")),
  isVisibleToClient: z.coerce.boolean(),
});

export const createProcessUpdateSchema = z.object({
  processId: z.string().uuid(),
  clientId: z.string().uuid(),
  updateDate: z.string().min(1),
  plainLanguageSummary: z.string().trim().min(1, "Descreva o andamento."),
  classification: z.string().trim().optional().or(z.literal("")),
  originalText: z.string().trim().max(20000).optional().or(z.literal("")),
  publishToPortal: z.coerce.boolean(),
});

export const createHearingSchema = z.object({
  processId: z.string().uuid(),
  clientId: z.string().uuid(),
  title: z.string().trim().min(1),
  scheduledAt: z.string().min(1),
  modality: z.string().trim().optional().or(z.literal("")),
  location: z.string().trim().optional().or(z.literal("")),
  publishToPortal: z.coerce.boolean(),
});

export const createDeadlineSchema = z.object({
  processId: z.string().uuid(),
  clientId: z.string().uuid(),
  description: z.string().trim().min(1),
  dueDate: z.string().min(1),
  priority: z.string().trim().optional().or(z.literal("")),
  publishToPortal: z.coerce.boolean(),
});

export const createContractSchema = z.object({
  clientId: z.string().uuid(),
  processId: z.string().uuid().optional().or(z.literal("")),
  contractNumber: z.string().trim().min(1),
  serviceType: z.string().trim().optional().or(z.literal("")),
  totalValue: z.coerce.number().nonnegative().optional(),
  publishToPortal: z.coerce.boolean(),
});

export const createFinancialEntrySchema = z.object({
  clientId: z.string().uuid(),
  contractId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().trim().min(1),
  amount: z.coerce.number().positive("Informe um valor válido."),
  dueDate: z.string().min(1),
  publishToPortal: z.coerce.boolean(),
});

export const updateFinancialStatusSchema = z.object({
  entryId: z.string().uuid(),
  status: z.enum(["pago", "pendente", "a_vencer", "vencido", "renegociado", "cancelado"]),
});

export const toggleDocumentVisibilitySchema = z.object({
  documentId: z.string().uuid(),
  isVisibleToClient: z.coerce.boolean(),
  reviewed: z.coerce.boolean(),
});

export const assignStaffSchema = z.object({
  profileId: z.string().uuid(),
  clientId: z.string().uuid(),
});
