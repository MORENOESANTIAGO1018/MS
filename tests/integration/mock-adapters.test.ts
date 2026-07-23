import { describe, expect, it } from "vitest";
import { MockNotionAdapter } from "@/lib/server/notion.mock";
import { MockClaudeAdapter } from "@/lib/server/claude.mock";
import { claudeSummaryOutputSchema } from "@/lib/server/claude.schema";

/**
 * Testes de integracao dos adaptadores mock — garantem que, mesmo sem
 * credenciais reais configuradas (ambiente de desenvolvimento/CI), o
 * contrato de dados usado pelo restante da aplicacao permanece valido.
 */
describe("MockNotionAdapter", () => {
  it("retorna clientes ficticios com formato esperado", async () => {
    const adapter = new MockNotionAdapter();
    const clients = await adapter.listClients();
    expect(clients.length).toBeGreaterThan(0);
    expect(clients[0]).toMatchObject({
      notionPageId: expect.any(String),
      fullName: expect.stringContaining("fictícia"),
    });
  });

  it("retorna processos vinculados a clientes existentes", async () => {
    const adapter = new MockNotionAdapter();
    const clients = await adapter.listClients();
    const processes = await adapter.listProcesses();
    const clientIds = new Set(clients.map((c) => c.notionPageId));
    for (const process of processes) {
      expect(clientIds.has(process.clientNotionPageId)).toBe(true);
    }
  });

  it("retorna andamentos vinculados a processos existentes", async () => {
    const adapter = new MockNotionAdapter();
    const processes = await adapter.listProcesses();
    const updates = await adapter.listProcessUpdates();
    const processIds = new Set(processes.map((p) => p.notionPageId));
    for (const update of updates) {
      expect(processIds.has(update.processNotionPageId)).toBe(true);
    }
  });
});

describe("MockClaudeAdapter", () => {
  it("produz saida que satisfaz o schema estrutural exigido", async () => {
    const adapter = new MockClaudeAdapter();
    const output = await adapter.summarizeProcessUpdate({
      originalText: "Texto de andamento ficticio para teste.",
      processNumber: "0000000-00.2026.8.26.0100 (fictício)",
      practiceArea: "Cível",
    });

    const parsed = claudeSummaryOutputSchema.safeParse(output);
    expect(parsed.success).toBe(true);
    expect(output.model).toBe("mock-claude");
  });

  it("nunca afirma resultado do processo (heuristica de palavras proibidas)", async () => {
    const adapter = new MockClaudeAdapter();
    const output = await adapter.summarizeProcessUpdate({
      originalText: "Texto de andamento ficticio.",
      processNumber: "123",
      practiceArea: null,
    });
    const forbidden = ["garantimos", "certamente vai ganhar", "resultado garantido"];
    for (const phrase of forbidden) {
      expect(output.plainLanguageSummary.toLowerCase()).not.toContain(phrase);
      expect(output.technicalSummary.toLowerCase()).not.toContain(phrase);
    }
  });
});
