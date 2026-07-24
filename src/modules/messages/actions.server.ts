"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyN8n } from "@/lib/server/n8n-notify";
import { getClientContact } from "@/lib/server/client-contact";
import { getPublicEnv } from "@/lib/env";
import { sendMessageSchema } from "./schema";

export interface SendMessageResult {
  success: boolean;
  message: string;
}

/**
 * Envia uma mensagem no canal do cliente. Nao usa service role — a RLS
 * (messages_insert policy) ja garante que sender_profile_id = auth.uid() e
 * que sender_role bate com o papel real do usuario autenticado.
 */
export async function sendMessage(formData: FormData): Promise<SendMessageResult> {
  const parsed = sendMessageSchema.safeParse({
    clientId: formData.get("clientId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
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

  const senderRole = profile?.role === "client" ? "client" : "staff";

  const { error } = await supabase.from("messages").insert({
    client_id: parsed.data.clientId,
    sender_profile_id: user.id,
    sender_role: senderRole,
    body: parsed.data.body,
  });

  if (error) {
    return { success: false, message: "Não foi possível enviar a mensagem." };
  }

  // Notifica a outra ponta (workflow n8n "10-nova-mensagem"): se quem
  // enviou foi o cliente, avisa o e-mail geral do escritório; se foi a
  // equipe, avisa o e-mail do cliente. Nenhum dos dois exige o n8n consultar
  // o banco diretamente.
  const recipientEmail =
    senderRole === "client"
      ? getPublicEnv().NEXT_PUBLIC_OFFICE_EMAIL || null
      : (await getClientContact(parsed.data.clientId))?.email ?? null;

  await notifyN8n("nova-mensagem", {
    clientId: parsed.data.clientId,
    senderRole,
    recipientEmail,
  });

  revalidatePath("/mensagens");
  return { success: true, message: "Mensagem enviada." };
}

export async function markMessagesAsRead(clientId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .is("read_at", null);
}
