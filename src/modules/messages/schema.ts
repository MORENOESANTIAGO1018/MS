import { z } from "zod";

export const sendMessageSchema = z.object({
  clientId: z.string().uuid(),
  body: z.string().trim().min(1, "Escreva uma mensagem.").max(4000),
});
