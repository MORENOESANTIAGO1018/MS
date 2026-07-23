import { z } from "zod";

export const createSupportRequestSchema = z.object({
  clientId: z.string().uuid(),
  subject: z.string().trim().min(1, "Informe o assunto.").max(200),
  body: z.string().trim().min(1, "Descreva sua solicitação.").max(4000),
});
