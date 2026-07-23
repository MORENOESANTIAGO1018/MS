import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Prazos sao informativos ao cliente — somente leitura (Fase 8/MODELO-DE-DADOS.md). */
export async function listDeadlinesForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deadlines")
    .select("*")
    .eq("client_id", clientId)
    .order("due_date", { ascending: true });

  if (error) throw new Error("Não foi possível carregar os prazos.");
  return data;
}
