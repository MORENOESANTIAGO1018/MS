import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";
import { generateFinancialStatementPdf } from "@/modules/financial/pdf-statement";
import { recordAccessLog } from "@/lib/server/access-log";
import { logger } from "@/lib/logger";

/**
 * Gera e retorna o extrato financeiro em PDF (Fase 8). O próprio cliente
 * baixa o seu extrato (client_id resolvido via client_access); staff/admin
 * podem passar ?clientId= para gerar o extrato de um cliente específico.
 * A lista de lançamentos é sempre buscada com o cliente Supabase no
 * contexto do usuário — a RLS de financial_entries garante que nenhum dado
 * de outro cliente entre no PDF.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const requestedClientId = request.nextUrl.searchParams.get("clientId");

  let clientId: string;
  if (requestedClientId) {
    clientId = requestedClientId;
  } else {
    const { data: access } = await supabase
      .from("client_access")
      .select("client_id")
      .eq("profile_id", user.id)
      .eq("is_active", true)
      .in("access_level", ["owner", "viewer"])
      .limit(1)
      .maybeSingle();

    if (!access) {
      return NextResponse.json({ error: "Nenhum cliente associado." }, { status: 404 });
    }
    clientId = access.client_id;
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  const { data: entries, error } = await supabase
    .from("financial_entries")
    .select("*")
    .eq("client_id", clientId)
    .order("due_date", { ascending: true });

  if (error) {
    logger.error("Falha ao carregar lançamentos para extrato", { error: error.message });
    return NextResponse.json({ error: "Não foi possível gerar o extrato." }, { status: 500 });
  }

  const env = getPublicEnv();
  const pdfBytes = await generateFinancialStatementPdf({
    clientName: client.full_name,
    officeName: env.NEXT_PUBLIC_OFFICE_NAME,
    entries: entries ?? [],
  });

  await recordAccessLog({
    profileId: user.id,
    clientId: client.id,
    action: "financial_statement_downloaded",
    resourceType: "financial_entries",
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="extrato-financeiro.pdf"`,
    },
  });
}
