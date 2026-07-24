import { NextResponse, type NextRequest } from "next/server";
import { authorizeAutomationRequest } from "@/lib/server/webhook-auth";
import { runAiSummaryDigest } from "@/modules/ai-summaries/digest.actions.server";
import { logger } from "@/lib/logger";

/** Workflow n8n "09-alerta-resumo-ia-pendente" (Fase 11). */
export async function POST(request: NextRequest) {
  const unauthorized = await authorizeAutomationRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const summary = await runAiSummaryDigest();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Falha inesperada no alerta de resumos de IA pendentes", { error: message });
    return NextResponse.json({ error: "Falha no alerta de resumos pendentes." }, { status: 500 });
  }
}
