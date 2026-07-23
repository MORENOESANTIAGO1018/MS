import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface PortalContext {
  userId: string;
  profile: ProfileRow;
  client: ClientRow;
}

/**
 * Resolve o contexto do portal para o usuario autenticado: profile + client
 * associado via client_access (owner/viewer). Toda a resolucao respeita RLS
 * (usa o cliente Supabase no contexto do usuario, nunca o admin), entao um
 * usuario so consegue resolver o proprio cliente por construcao.
 *
 * Redireciona para /entrar se nao houver sessao valida, e para /suporte se o
 * usuario nao tiver nenhum cliente associado (estado inconsistente).
 */
export async function getPortalContext(): Promise<PortalContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/entrar");
  }

  const { data: access } = await supabase
    .from("client_access")
    .select("client_id, clients(*)")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .in("access_level", ["owner", "viewer"])
    .limit(1)
    .maybeSingle();

  const client = access?.clients as unknown as ClientRow | undefined;

  if (!access || !client) {
    redirect("/suporte?motivo=sem-cliente-associado");
  }

  return { userId: user.id, profile, client };
}
