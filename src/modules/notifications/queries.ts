import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listNotificationsForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar as notificações.");
  return data;
}

export async function countUnreadNotificationsForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .is("read_at", null);

  if (error) throw new Error("Não foi possível contar notificações.");
  return count ?? 0;
}
