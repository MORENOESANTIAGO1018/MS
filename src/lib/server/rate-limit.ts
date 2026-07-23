import "server-only";
import { getServerEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "./supabase-admin";
import { logger } from "@/lib/logger";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Limitador de tentativas com estado persistido em
 * public.auth_rate_limits (Supabase), para funcionar corretamente em
 * ambientes serverless multi-instancia (Vercel) — um contador em memoria de
 * processo nao sobreviveria entre invocacoes de funcao.
 *
 * Usado em login, solicitacao de OTP, recuperacao de senha e ativacao
 * (Fase 4, regra "limitacao de tentativas").
 */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  const env = getServerEnv();
  const windowMs = env.AUTH_RATE_LIMIT_WINDOW_MIN * 60_000;
  const maxAttempts = env.AUTH_RATE_LIMIT_MAX_ATTEMPTS;
  const admin = getSupabaseAdminClient();

  const nowIso = new Date().toISOString();
  const { data: existing, error: readError } = await admin
    .from("auth_rate_limits")
    .select("attempts, window_started_at")
    .eq("key", key)
    .maybeSingle();

  if (readError) {
    logger.error("Falha ao ler auth_rate_limits", { error: readError.message });
    // Fail-closed seria bloquear tudo; preferimos fail-open com log de erro
    // para nao derrubar o login por indisponibilidade momentanea do banco,
    // mas o erro fica registrado para investigacao.
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  }

  const windowStart = existing ? new Date(existing.window_started_at).getTime() : 0;
  const windowExpired = !existing || Date.now() - windowStart > windowMs;

  if (windowExpired) {
    await admin
      .from("auth_rate_limits")
      .upsert({ key, attempts: 1, window_started_at: nowIso, updated_at: nowIso });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
  }

  const attempts = existing.attempts + 1;
  const allowed = attempts <= maxAttempts;
  await admin
    .from("auth_rate_limits")
    .update({ attempts, updated_at: nowIso })
    .eq("key", key);

  const retryAfterSeconds = allowed
    ? 0
    : Math.ceil((windowStart + windowMs - Date.now()) / 1000);

  return { allowed, remaining: Math.max(0, maxAttempts - attempts), retryAfterSeconds };
}

/** Reseta o contador apos uma acao bem-sucedida (ex.: login correto). */
export async function resetRateLimit(key: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  await admin.from("auth_rate_limits").delete().eq("key", key);
}
