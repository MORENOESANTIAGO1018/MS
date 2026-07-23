import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listMessagesForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (error) throw new Error("Não foi possível carregar as mensagens.");
  return data;
}

export async function countUnreadMessagesForClient(clientId: string, sinceRole: "client" | "staff") {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .is("read_at", null)
    .neq("sender_role", sinceRole);

  if (error) throw new Error("Não foi possível contar mensagens não lidas.");
  return count ?? 0;
}
