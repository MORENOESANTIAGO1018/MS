import { NextResponse, type NextRequest } from "next/server";
import { authorizeAutomationRequest } from "@/lib/server/webhook-auth";
import { buildDailyReportPayload } from "@/modules/admin/daily-report.actions.server";
import { logger } from "@/lib/logger";

/**
 * Workflow n8n "11-relatorio-diario-admin" (Fase 11): retorna os indicadores
 * do dia para o n8n formatar em e-mail/mensagem para a equipe.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await authorizeAutomationRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const payload = await buildDailyReportPayload();
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Falha inesperada ao montar relatório diário", { error: message });
    return NextResponse.json({ error: "Falha ao montar relatório diário." }, { status: 500 });
  }
}
