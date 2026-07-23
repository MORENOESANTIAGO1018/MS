import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Todas as consultas abaixo usam o cliente Supabase no contexto do usuario
 * (RLS aplicada) — NAO usam service role. Isso e intencional: a RLS ja
 * garante que staff ve apenas clientes atribuidos (via client_access) e
 * admin ve tudo, entao a mesma query serve para os dois papeis sem logica
 * condicional na aplicacao.
 */

export async function getCurrentStaffProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
}

export async function listAllClients() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os clientes.");
  return data;
}

export async function getClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (error) throw new Error("Não foi possível carregar o cliente.");
  return data;
}

export async function listAllProcesses() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("processes")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os processos.");
  return data;
}

export async function listAllProcessUpdates() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("process_updates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os andamentos.");
  return data;
}

export async function listAllHearings() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("hearings")
    .select("*")
    .order("scheduled_at", { ascending: true });
  if (error) throw new Error("Não foi possível carregar as audiências.");
  return data;
}

export async function listAllDeadlines() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deadlines")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw new Error("Não foi possível carregar os prazos.");
  return data;
}

export async function listAllContracts() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os contratos.");
  return data;
}

export async function listAllFinancialEntries() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_entries")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw new Error("Não foi possível carregar o financeiro.");
  return data;
}

export async function listAllDocuments() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os documentos.");
  return data;
}

export async function listAllMessages() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Não foi possível carregar as mensagens.");
  return data;
}

export async function listAllUsers() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os usuários.");
  return data;
}

export async function listAllClientAccess() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("client_access")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar as permissões.");
  return data;
}

export async function listAccessLogs(limit = 100) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("access_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Não foi possível carregar os logs de acesso.");
  return data;
}

export async function listAuditLogs(limit = 100) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Não foi possível carregar os logs de auditoria.");
  return data;
}

export async function listNotionSyncLogs(limit = 50) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notion_sync_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Não foi possível carregar os logs de sincronização.");
  return data;
}

export async function listPendingAiSummaries() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_summaries")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Não foi possível carregar os resumos de IA.");
  return data;
}

export async function getDashboardStats() {
  const supabase = await createSupabaseServerClient();

  const [clients, processes, deadlines, hearings, financial, documents, pendingAi] =
    await Promise.all([
      supabase.from("clients").select("id, status", { count: "exact" }),
      supabase.from("processes").select("id, status", { count: "exact" }),
      supabase.from("deadlines").select("id, due_date, status"),
      supabase.from("hearings").select("id, scheduled_at, status"),
      supabase.from("financial_entries").select("id, status, amount"),
      supabase.from("documents").select("id, reviewed"),
      supabase.from("ai_summaries").select("id", { count: "exact" }).eq("status", "pending_review"),
    ]);

  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    totalClients: clients.count ?? 0,
    activeClients: (clients.data ?? []).filter((c) => c.status === "Cliente ativo").length,
    totalProcesses: processes.count ?? 0,
    activeProcesses: (processes.data ?? []).filter((p) => p.status === "Ativo").length,
    upcomingDeadlines: (deadlines.data ?? []).filter(
      (d) => d.status !== "Concluído" && new Date(d.due_date) <= in7days,
    ).length,
    upcomingHearings: (hearings.data ?? []).filter(
      (h) => new Date(h.scheduled_at) >= now && new Date(h.scheduled_at) <= in7days,
    ).length,
    overdueFinancial: (financial.data ?? []).filter((f) => f.status === "vencido").length,
    pendingDocuments: (documents.data ?? []).filter((d) => !d.reviewed).length,
    pendingAiSummaries: pendingAi.count ?? 0,
  };
}
