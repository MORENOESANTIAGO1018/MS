"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateOwnClientDataSchema } from "./schema";

export interface UpdateOwnClientDataResult {
  success: boolean;
  message: string;
}

/**
 * Cliente atualiza os proprios dados cadastrais permitidos. A RLS
 * (clients_update policy) + trigger prevent_client_restricted_fields_update
 * garantem que somente nome/e-mail/telefone/whatsapp podem mudar quando
 * quem executa e o proprio cliente — mesmo que este Server Action seja
 * contornado, o banco protege os campos restritos.
 */
export async function updateOwnClientData(
  formData: FormData,
): Promise<UpdateOwnClientDataResult> {
  const parsed = updateOwnClientDataSchema.safeParse({
    clientId: formData.get("clientId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { clientId, fullName, email, phone, whatsapp } = parsed.data;

  const { error } = await supabase
    .from("clients")
    .update({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) {
    return { success: false, message: "Não foi possível atualizar seus dados." };
  }

  revalidatePath("/meus-dados");
  return { success: true, message: "Dados atualizados com sucesso." };
}
