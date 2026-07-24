import { NextResponse, type NextRequest } from "next/server";
import { authorizeAutomationRequest } from "@/lib/server/webhook-auth";
import { purgeOldLogs } from "@/modules/admin/log-retention.actions.server";
import { logger } from "@/lib/logger";

/**
 * Workflow n8n "12-purga-logs-antigos" (Fase 11 + Fase 13): expurga
 * access_logs/audit_logs além do prazo de retenção configurado
 * (AUDIT_LOG_RETENTION_DAYS). Restrito a admin/staff autenticado ou à
 * automação n8n — nunca acessível anonimamente.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await authorizeAutomationRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const summary = await purgeOldLogs();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Falha inesperada na expurgação de logs", { error: message });
    return NextResponse.json({ error: "Falha na expurgação de logs." }, { status: 500 });
  }
}
