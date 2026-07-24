import { NextResponse, type NextRequest } from "next/server";
import { authorizeAutomationRequest } from "@/lib/server/webhook-auth";
import { runHearingReminders } from "@/modules/hearings/notify.actions.server";
import { logger } from "@/lib/logger";

/** Workflow n8n "05-lembrete-audiencia" (Fase 11). */
export async function POST(request: NextRequest) {
  const unauthorized = await authorizeAutomationRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const summary = await runHearingReminders();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Falha inesperada no lembrete de audiências", { error: message });
    return NextResponse.json({ error: "Falha no lembrete de audiências." }, { status: 500 });
  }
}
