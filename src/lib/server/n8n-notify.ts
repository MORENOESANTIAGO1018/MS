import "server-only";
import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Dispara um webhook n8n (sentido portal -> n8n), usado pelos workflows de
 * notificação transacional (Fase 11): convite criado, código reenviado,
 * andamento publicado, documento novo, nova mensagem. Autenticado por
 * N8N_TRIGGER_TOKEN no header `x-portal-token`, que o workflow n8n valida
 * antes de processar (ver automations/n8n/README.md).
 *
 * Se N8N_BASE_URL nao estiver configurado (dev/CI sem instancia real de
 * n8n), a chamada e apenas logada e ignorada — nunca lanca excecao, para
 * nao quebrar o fluxo principal (criar convite, publicar andamento, etc.)
 * por causa de uma automacao opcional.
 */
export async function notifyN8n(eventPath: string, payload: Record<string, unknown>): Promise<void> {
  const env = getServerEnv();

  if (!env.N8N_BASE_URL || !env.N8N_TRIGGER_TOKEN) {
    logger.warn("N8N_BASE_URL/N8N_TRIGGER_TOKEN ausentes — notificação n8n ignorada (mock)", {
      eventPath,
    });
    return;
  }

  try {
    const response = await fetch(`${env.N8N_BASE_URL.replace(/\/$/, "")}/webhook/${eventPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-portal-token": env.N8N_TRIGGER_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.error("n8n respondeu com erro ao notificar evento", {
        eventPath,
        status: response.status,
      });
    }
  } catch (error) {
    // Falha de rede ao notificar n8n nunca deve derrubar a acao principal.
    logger.error("Falha ao chamar webhook n8n", {
      eventPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
