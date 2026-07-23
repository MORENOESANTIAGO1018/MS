"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupportRequestSchema } from "./schema";

export interface CreateSupportRequestResult {
  success: boolean;
  message: string;
}

export async function createSupportRequest(
  formData: FormData,
): Promise<CreateSupportRequestResult> {
  const parsed = createSupportRequestSchema.safeParse({
    clientId: formData.get("clientId"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("support_requests").insert({
    client_id: parsed.data.clientId,
    subject: parsed.data.subject,
    body: parsed.data.body,
    status: "Aberto",
  });

  if (error) {
    return { success: false, message: "Não foi possível enviar sua solicitação." };
  }

  revalidatePath("/suporte");
  return { success: true, message: "Solicitação enviada. Retornaremos em breve." };
}
