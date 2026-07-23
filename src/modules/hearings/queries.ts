import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listHearingsForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("hearings")
    .select("*")
    .eq("client_id", clientId)
    .order("scheduled_at", { ascending: true });

  if (error) throw new Error("Não foi possível carregar as audiências.");
  return data;
}

export async function getNextHearingForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("hearings")
    .select("*")
    .eq("client_id", clientId)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("Não foi possível carregar a próxima audiência.");
  return data;
}
