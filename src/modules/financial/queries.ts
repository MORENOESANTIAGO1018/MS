import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FinancialStatus } from "@/lib/supabase/database.types";

export async function listFinancialEntriesForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_entries")
    .select("*")
    .eq("client_id", clientId)
    .order("due_date", { ascending: true });

  if (error) throw new Error("Não foi possível carregar o financeiro.");
  return data;
}

export async function listPendingFinancialEntriesForClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const pendingStatuses: FinancialStatus[] = ["pendente", "a_vencer", "vencido"];
  const { data, error } = await supabase
    .from("financial_entries")
    .select("*")
    .eq("client_id", clientId)
    .in("status", pendingStatuses)
    .order("due_date", { ascending: true });

  if (error) throw new Error("Não foi possível carregar as parcelas pendentes.");
  return data;
}

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, string> = {
  pago: "Pago",
  pendente: "Pendente",
  a_vencer: "A vencer",
  vencido: "Vencido",
  renegociado: "Renegociado",
  cancelado: "Cancelado",
};
