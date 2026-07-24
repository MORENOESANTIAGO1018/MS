import { NextResponse, type NextRequest } from "next/server";
import { authorizeAutomationRequest } from "@/lib/server/webhook-auth";
import { runDeadlineReminders } from "@/modules/deadlines/notify.actions.server";
import { logger } from "@/lib/logger";

/** Workflow n8n "06-lembrete-prazo" (Fase 11). */
export async function POST(request: NextRequest) {
  const unauthorized = await authorizeAutomationRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const summary = await runDeadlineReminders();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Falha inesperada no lembrete de prazos", { error: message });
    return NextResponse.json({ error: "Falha no lembrete de prazos." }, { status: 500 });
  }
}
