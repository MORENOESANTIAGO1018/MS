import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listDocumentsForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os documentos.");
  return data;
}

export async function listRecentDocumentsForClient(clientId: string, limit = 5) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error("Não foi possível carregar os documentos recentes.");
  return data;
}
