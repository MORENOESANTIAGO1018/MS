import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listContractsForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os contratos.");
  return data;
}
