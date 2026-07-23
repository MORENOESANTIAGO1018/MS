import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { isValidWebhookSecret } from "@/lib/server/webhook-auth";
import { runPaymentDueNotifications } from "@/modules/financial/notify.actions.server";
import { logger } from "@/lib/logger";

/**
 * Dispara a checagem de vencimentos (Fase 8, consumido pelo workflow n8n da
 * Fase 11). Mesmo modelo de autorização de app/api/notion/sync: chamada
 * autenticada por sessão staff/admin (disparo manual) OU pela automação n8n
 * via segredo compartilhado `x-n8n-secret`.
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

  try {
    const summary = await runPaymentDueNotifications();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Falha inesperada na checagem de vencimentos", { error: message });
    return NextResponse.json({ error: "Falha na checagem de vencimentos." }, { status: 500 });
  }
}
