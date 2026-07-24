import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";

/**
 * Compara o segredo enviado por um chamador externo (n8n) com o valor
 * configurado, em tempo constante. Usado por rotas que aceitam disparo tanto
 * de um usuario autenticado (sessao) quanto de uma automacao externa via
 * cabecalho compartilhado.
 */
export function isValidWebhookSecret(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Autorizacao compartilhada pelas rotas de automacao (Fase 11): aceita OU o
 * segredo compartilhado `x-n8n-secret` (chamada do n8n) OU uma sessao
 * staff/admin autenticada (disparo manual). Retorna null se autorizado, ou
 * uma NextResponse de erro pronta para o Route Handler retornar.
 */
export async function authorizeAutomationRequest(request: NextRequest): Promise<NextResponse | null> {
  const env = getServerEnv();
  const providedSecret = request.headers.get("x-n8n-secret");
  if (isValidWebhookSecret(providedSecret, env.N8N_WEBHOOK_SECRET)) {
    return null;
  }

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

  return null;
}
