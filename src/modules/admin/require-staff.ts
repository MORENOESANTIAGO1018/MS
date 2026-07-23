import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Segunda barreira alem do middleware: resolve o profile do usuario e
 * garante papel staff/admin. O middleware ja bloqueia clientes na rota
 * /admin/*, mas paginas server-side nao devem confiar apenas nisso.
 */
export async function requireStaffProfile(): Promise<ProfileRow> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role === "client" || !profile.is_active) {
    redirect("/painel");
  }

  return profile;
}
