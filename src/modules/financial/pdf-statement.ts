import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatCurrency, formatDate } from "@/lib/format";
import { FINANCIAL_STATUS_LABELS } from "./queries";
import type { Database } from "@/lib/supabase/database.types";

type FinancialEntryRow = Database["public"]["Tables"]["financial_entries"]["Row"];

const PAGE_MARGIN = 50;
const LINE_HEIGHT = 18;

/**
 * Gera um extrato financeiro simples em PDF (Fase 8). Usa pdf-lib
 * diretamente (sem dependências de renderização React) para manter o
 * gerador leve e determinístico. Nunca inclui dados de outros clientes —
 * quem monta a lista de `entries` já filtrou por RLS/client_id antes de
 * chamar esta função.
 */
export async function generateFinancialStatementPdf(params: {
  clientName: string;
  officeName: string;
  entries: FinancialEntryRow[];
}): Promise<Uint8Array> {
  const { clientName, officeName, entries } = params;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { height, width } = page.getSize();
  let cursorY = height - PAGE_MARGIN;

  function drawLine(text: string, options: { bold?: boolean; size?: number } = {}) {
    if (cursorY < PAGE_MARGIN) {
      page = pdfDoc.addPage([595.28, 841.89]);
      cursorY = page.getSize().height - PAGE_MARGIN;
    }
    page.drawText(text, {
      x: PAGE_MARGIN,
      y: cursorY,
      size: options.size ?? 10,
      font: options.bold ? boldFont : font,
      color: rgb(0.1, 0.1, 0.15),
      maxWidth: width - PAGE_MARGIN * 2,
    });
    cursorY -= LINE_HEIGHT;
  }

  drawLine(officeName, { bold: true, size: 14 });
  drawLine("Extrato financeiro", { bold: true, size: 12 });
  cursorY -= 6;
  drawLine(`Cliente: ${clientName}`);
  drawLine(`Emitido em: ${formatDate(new Date().toISOString())}`);
  cursorY -= 12;

  if (entries.length === 0) {
    drawLine("Nenhum lançamento financeiro registrado.");
  } else {
    drawLine("Descrição / Vencimento / Valor / Status", { bold: true });
    cursorY -= 4;
    for (const entry of entries) {
      const paidSuffix = entry.paid_at ? ` (pago em ${formatDate(entry.paid_at)})` : "";
      drawLine(
        `${entry.description} — vence ${formatDate(entry.due_date)} — ` +
          `${formatCurrency(entry.amount)} — ${FINANCIAL_STATUS_LABELS[entry.status]}${paidSuffix}`,
      );
    }

    cursorY -= 12;
    const totalPendente = entries
      .filter((e) => e.status !== "pago" && e.status !== "cancelado")
      .reduce((sum, e) => sum + Number(e.amount), 0);
    drawLine(`Total pendente: ${formatCurrency(totalPendente)}`, { bold: true });
  }

  cursorY -= 20;
  drawLine(
    "Este documento é gerado automaticamente e reflete apenas os lançamentos " +
      "marcados como visíveis no portal do cliente.",
    { size: 8 },
  );

  return pdfDoc.save();
}
