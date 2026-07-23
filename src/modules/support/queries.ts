import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listSupportRequestsForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("support_requests")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar as solicitações de suporte.");
  return data;
}
