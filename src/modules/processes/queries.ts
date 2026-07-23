import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Lista processos do cliente. A RLS ja garante que somente processos com
 * is_visible_to_client=true (para papel client) sao retornados — nao ha
 * filtro adicional necessario aqui alem do client_id, que serve apenas para
 * escopar a consulta (a policy faria isso de qualquer forma).
 */
export async function listProcessesForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("processes")
    .select("*")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os processos.");
  return data;
}

export async function getProcessDetail(processId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("processes")
    .select("*")
    .eq("id", processId)
    .maybeSingle();

  if (error) throw new Error("Não foi possível carregar o processo.");
  return data;
}

export async function listProcessUpdatesForProcess(processId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("process_updates")
    .select("*")
    .eq("process_id", processId)
    .order("update_date", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os andamentos.");
  return data;
}

export async function listProcessUpdatesForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("process_updates")
    .select("*")
    .eq("client_id", clientId)
    .order("update_date", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os andamentos.");
  return data;
}
