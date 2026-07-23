import { z } from "zod";

/** Somente os campos que um cliente pode retificar (Fase 5 "meus dados"). O
 * banco (trigger prevent_client_restricted_fields_update) rejeita qualquer
 * outra alteracao mesmo que este schema seja contornado. */
export const updateOwnClientDataSchema = z.object({
  clientId: z.string().uuid(),
  fullName: z.string().trim().min(1, "Informe o nome completo."),
  email: z.string().trim().email("Informe um e-mail válido.").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  whatsapp: z.string().trim().optional().or(z.literal("")),
});
