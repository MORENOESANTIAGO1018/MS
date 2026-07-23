import "server-only";
import type {
  NotionAdapter,
  NotionClientRecord,
  NotionProcessRecord,
  NotionProcessUpdateRecord,
} from "./notion.types";

/**
 * Adaptador simulado do Notion, usado quando NOTION_TOKEN nao esta configurado
 * (desenvolvimento local/CI sem credencial real). Retorna dados fictícios
 * deterministicos — nunca dados reais. Ver VARIAVEIS-DE-AMBIENTE.md secao
 * "Regra para credenciais ausentes".
 */
export class MockNotionAdapter implements NotionAdapter {
  async listClients(): Promise<NotionClientRecord[]> {
    return [
      {
        notionPageId: "mock-client-0001",
        lastEditedTime: new Date().toISOString(),
        fullName: "Maria Teste da Silva (fictícia)",
        email: "maria.teste@exemplo-ficticio.com",
        phone: "+55 11 90001-0001",
        status: "Cliente ativo",
        internalCode: "CLI-0001",
        documentLast4: "0001",
        portalAtivo: true,
      },
    ];
  }

  async listProcesses(): Promise<NotionProcessRecord[]> {
    return [
      {
        notionPageId: "mock-process-0001",
        lastEditedTime: new Date().toISOString(),
        clientNotionPageId: "mock-client-0001",
        processNumber: "0000001-01.2024.8.26.0100 (fictício)",
        court: "TJ",
        phase: "Instrução",
        status: "Ativo",
        practiceArea: "Família",
        clientSummary: "Seu processo está na fase de instrução, aguardando audiência.",
        publishToPortal: true,
      },
    ];
  }

  async listProcessUpdates(): Promise<NotionProcessUpdateRecord[]> {
    return [
      {
        notionPageId: "mock-update-0001",
        lastEditedTime: new Date().toISOString(),
        processNotionPageId: "mock-process-0001",
        updateDate: new Date().toISOString().slice(0, 10),
        plainLanguageSummary: "O juiz marcou a audiência para o dia 10 de agosto.",
        classification: "Despacho",
        possibleDeadline: null,
        reviewedByLawyer: true,
        publishToPortal: true,
      },
    ];
  }
}
