import { describe, expect, it } from "vitest";
import { generateFinancialStatementPdf } from "@/modules/financial/pdf-statement";
import type { Database } from "@/lib/supabase/database.types";

type FinancialEntryRow = Database["public"]["Tables"]["financial_entries"]["Row"];

function buildEntry(overrides: Partial<FinancialEntryRow> = {}): FinancialEntryRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    client_id: "00000000-0000-0000-0000-000000000002",
    contract_id: null,
    process_id: null,
    description: "Honorários — parcela 1/3 (fictício)",
    entry_type: null,
    installment_label: null,
    amount: 1500,
    due_date: "2026-08-01",
    paid_at: null,
    status: "pendente",
    payment_method: null,
    payment_link: null,
    receipt_storage_path: null,
    notion_page_id: null,
    is_visible_to_client: true,
    created_by: null,
    updated_by: null,
    archived_at: null,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("generateFinancialStatementPdf", () => {
  it("gera um PDF valido mesmo sem lancamentos", async () => {
    const bytes = await generateFinancialStatementPdf({
      clientName: "Cliente Fictício",
      officeName: "Moreno & Santiago Advogados",
      entries: [],
    });
    const header = Buffer.from(bytes.slice(0, 5)).toString("utf-8");
    expect(header).toBe("%PDF-");
  });

  it("gera um PDF valido com lancamentos, sem lancar excecao", async () => {
    const bytes = await generateFinancialStatementPdf({
      clientName: "Cliente Fictício",
      officeName: "Moreno & Santiago Advogados",
      entries: [buildEntry(), buildEntry({ id: "00000000-0000-0000-0000-000000000003", status: "pago", paid_at: "2026-07-15" })],
    });
    const header = Buffer.from(bytes.slice(0, 5)).toString("utf-8");
    expect(header).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(100);
  });
});
