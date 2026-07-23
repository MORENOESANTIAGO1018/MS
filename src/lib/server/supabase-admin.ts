import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente Supabase com SERVICE ROLE KEY — ignora Row Level Security.
 *
 * Regras inegociaveis #3 e #4: esta chave nunca chega ao navegador e so
 * funciona no servidor. O pacote "server-only" faz o build falhar caso este
 * arquivo seja importado, direta ou indiretamente, por um Client Component.
 *
 * Uso permitido apenas em:
 *   - app/api/** /route.ts (Route Handlers)
 *   - src/modules/** /*.actions.server.ts
 * (reforcado tambem por regra de ESLint no-restricted-imports).
 *
 * Toda chamada relevante feita com este cliente deve gerar uma linha em
 * audit_logs — ver src/modules/admin/audit.ts.
 */
let cachedAdminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;

  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error("SUPABASE_SERVICE_ROLE_KEY ausente ao tentar criar cliente admin");
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY nao configurada. Operacoes de servidor que exigem " +
        "service role nao podem prosseguir. Configure a variavel em .env.local.",
    );
  }

  cachedAdminClient = createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  return cachedAdminClient;
}

/**
 * Revoga todas as sessoes ativas de um usuario (regra da Fase 6: "revogar
 * sessoes"). O SDK @supabase/supabase-js nesta versao so expoe
 * auth.admin.signOut(jwt) por token, nao por userId — usamos por isso o
 * endpoint administrativo GoTrue diretamente. Verificar contra o projeto
 * Supabase real antes de depender disso em producao (documentado em
 * CHECKLIST-DE-PRODUCAO.md).
 */
export async function adminRevokeAllSessions(userId: string): Promise<boolean> {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");
  }

  const response = await fetch(
    `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}/logout`,
    {
      method: "POST",
      headers: {
        apikey: serverEnv.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${serverEnv.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );

  if (!response.ok) {
    logger.error("Falha ao revogar sessoes do usuario", {
      status: response.status,
      userId,
    });
    return false;
  }

  return true;
}
