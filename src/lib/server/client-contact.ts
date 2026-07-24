import "server-only";
import { getSupabaseAdminClient } from "./supabase-admin";

export interface ClientContact {
  email: string | null;
  fullName: string;
}

/**
 * Lookup minimo de contato de um cliente (nome + e-mail), usado para
 * enriquecer os payloads dos webhooks de notificação n8n (Fase 11) — assim
 * o workflow n8n nunca precisa de acesso direto ao banco (principio
 * arquitetural documentado em ARQUITETURA.md), só recebe o destinatário
 * pronto no corpo do evento.
 */
export async function getClientContact(clientId: string): Promise<ClientContact | null> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("clients")
    .select("email, full_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!data) return null;
  return { email: data.email, fullName: data.full_name };
}
