import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { isValidWebhookSecret } from "@/lib/server/webhook-auth";
import { runNotionSync } from "@/modules/notion-sync/sync.actions.server";
import { logger } from "@/lib/logger";

/**
 * Dispara a sincronizacao Notion -> Supabase (Fase 7). Dois chamadores
 * legitimos:
 *  1) Um usuario staff/admin autenticado, clicando em "Sincronizar agora"
 *     no painel (/admin/sincronizacao).
 *  2) A automacao n8n (Fase 11), autenticada via cabecalho compartilhado
 *     `x-n8n-secret` comparado a N8N_WEBHOOK_SECRET (nunca no navegador —
 *     apenas o servidor n8n conhece esse valor).
 *
 * Qualquer outra chamada e rejeitada com 401/403 antes de tocar o Notion.
 */
export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const providedSecret = request.headers.get("x-n8n-secret");
  const isAutomationCall = isValidWebhookSecret(providedSecret, env.N8N_WEBHOOK_SECRET);

  if (!isAutomationCall) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role === "client" || !profile.is_active) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
  }

  let incremental = true;
  try {
    const body = await request.json();
    if (typeof body?.incremental === "boolean") incremental = body.incremental;
  } catch {
    // corpo ausente/vazio: usa o padrao incremental=true
  }

  try {
    const results = await runNotionSync(incremental);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Falha inesperada na sincronizacao Notion", { error: message });
    return NextResponse.json({ error: "Falha na sincronização." }, { status: 500 });
  }
}
