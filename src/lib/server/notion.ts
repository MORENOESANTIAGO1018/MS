import "server-only";
import { Client } from "@notionhq/client";
import { getServerEnv, hasCredential } from "@/lib/env";
import { logger } from "@/lib/logger";
import { MockNotionAdapter } from "./notion.mock";
import type {
  NotionAdapter,
  NotionClientRecord,
  NotionProcessRecord,
  NotionProcessUpdateRecord,
} from "./notion.types";

/**
 * Adaptador real do Notion. Le exclusivamente os campos necessarios (allowlist
 * aplicada em src/modules/notion-sync/allowed-fields.ts na camada de sync) e
 * so considera registros marcados como publicaveis no Notion.
 *
 * SERVER-ONLY: NOTION_TOKEN nunca deve ser acessado fora deste arquivo e dos
 * Route Handlers de sincronizacao.
 */
class RealNotionAdapter implements NotionAdapter {
  private client: Client;

  constructor(token: string) {
    this.client = new Client({ auth: token });
  }

  private async queryDatabase(databaseId: string, sinceIso?: string): Promise<unknown[]> {
    const filter = sinceIso
      ? {
          timestamp: "last_edited_time" as const,
          last_edited_time: { on_or_after: sinceIso },
        }
      : undefined;

    const results: unknown[] = [];
    let cursor: string | undefined;
    do {
      const response = await this.client.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        filter,
      });
      results.push(...response.results);
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return results;
  }

  async listClients(sinceIso?: string): Promise<NotionClientRecord[]> {
    const env = getServerEnv();
    if (!env.NOTION_TOKEN) return [];
    const dataSourceId = process.env.NOTION_DB_CLIENTES_ID;
    if (!dataSourceId) {
      logger.warn("NOTION_DB_CLIENTES_ID nao configurado — sync de clientes ignorado");
      return [];
    }
    const pages = await this.queryDatabase(dataSourceId, sinceIso);
    // O mapeamento fino de propriedades (com allowlist) ocorre em
    // src/modules/notion-sync/mappers/client.mapper.ts — aqui apenas
    // repassamos os "pages" brutos tipados via unknown para o mapper decidir.
    return pages.map((page) => mapRawClientPage(page));
  }

  async listProcesses(sinceIso?: string): Promise<NotionProcessRecord[]> {
    const dataSourceId = process.env.NOTION_DB_PROCESSOS_ID;
    if (!dataSourceId) {
      logger.warn("NOTION_DB_PROCESSOS_ID nao configurado — sync de processos ignorado");
      return [];
    }
    const pages = await this.queryDatabase(dataSourceId, sinceIso);
    return pages.map((page) => mapRawProcessPage(page));
  }

  async listProcessUpdates(sinceIso?: string): Promise<NotionProcessUpdateRecord[]> {
    const dataSourceId = process.env.NOTION_DB_ANDAMENTOS_ID;
    if (!dataSourceId) {
      logger.warn(
        "NOTION_DB_ANDAMENTOS_ID nao configurado — sync de andamentos ignorado",
      );
      return [];
    }
    const pages = await this.queryDatabase(dataSourceId, sinceIso);
    return pages.map((page) => mapRawProcessUpdatePage(page));
  }
}

// Os mappers abaixo sao deliberadamente conservadores: qualquer propriedade
// que nao esteja na allowlist do modulo notion-sync e ignorada em
// src/modules/notion-sync/allowed-fields.ts antes de qualquer persistencia.
// Estas funcoes apenas extraem o formato bruto do Notion para o shape comum.

function getPageId(page: unknown): string {
  return (page as { id: string }).id;
}

function getLastEditedTime(page: unknown): string {
  return (page as { last_edited_time: string }).last_edited_time;
}

function getProp(page: unknown, name: string): unknown {
  return (page as { properties: Record<string, unknown> }).properties?.[name];
}

function getPlainText(prop: unknown): string | null {
  const richText = (prop as { rich_text?: { plain_text: string }[] })?.rich_text;
  const title = (prop as { title?: { plain_text: string }[] })?.title;
  const list = richText ?? title;
  if (!list || list.length === 0) return null;
  return list.map((t) => t.plain_text).join("");
}

function getSelectName(prop: unknown): string | null {
  return (prop as { select?: { name: string } })?.select?.name ?? null;
}

function getCheckbox(prop: unknown): boolean {
  return Boolean((prop as { checkbox?: boolean })?.checkbox);
}

function getEmail(prop: unknown): string | null {
  return (prop as { email?: string })?.email ?? null;
}

function getPhone(prop: unknown): string | null {
  return (prop as { phone_number?: string })?.phone_number ?? null;
}

function getRelationFirstId(prop: unknown): string | null {
  const relation = (prop as { relation?: { id: string }[] })?.relation;
  return relation?.[0]?.id ?? null;
}

function getDate(prop: unknown): string | null {
  return (prop as { date?: { start: string } })?.date?.start ?? null;
}

function mapRawClientPage(page: unknown): NotionClientRecord {
  return {
    notionPageId: getPageId(page),
    lastEditedTime: getLastEditedTime(page),
    fullName: getPlainText(getProp(page, "Nome completo")) ?? "",
    email: getEmail(getProp(page, "E-mail")),
    phone: getPhone(getProp(page, "Telefone")),
    status: getSelectName(getProp(page, "Status")) ?? "Lead",
    internalCode: getPlainText(getProp(page, "Código interno")),
    documentLast4: null, // CPF nunca sincronizado por completo — ver allowed-fields.ts
  };
}

function mapRawProcessPage(page: unknown): NotionProcessRecord {
  return {
    notionPageId: getPageId(page),
    lastEditedTime: getLastEditedTime(page),
    clientNotionPageId: getRelationFirstId(getProp(page, "Cliente")) ?? "",
    processNumber: getPlainText(getProp(page, "Número do processo")) ?? "",
    court: getSelectName(getProp(page, "Tribunal")),
    phase: getSelectName(getProp(page, "Fase processual")),
    status: getSelectName(getProp(page, "Situação")) ?? "Ativo",
    practiceArea: getSelectName(getProp(page, "Área jurídica")),
    clientSummary: getPlainText(getProp(page, "Resumo para o cliente")),
    publishToPortal: getCheckbox(getProp(page, "Publicar no portal")),
  };
}

function mapRawProcessUpdatePage(page: unknown): NotionProcessUpdateRecord {
  return {
    notionPageId: getPageId(page),
    lastEditedTime: getLastEditedTime(page),
    processNotionPageId: getRelationFirstId(getProp(page, "Processo")) ?? "",
    updateDate: getDate(getProp(page, "Data do andamento")) ?? new Date().toISOString(),
    plainLanguageSummary: getPlainText(getProp(page, "Resumo em linguagem simples")),
    classification: getSelectName(getProp(page, "Classificação")),
    possibleDeadline: getDate(getProp(page, "Possível prazo")),
    reviewedByLawyer: getCheckbox(getProp(page, "Revisado por advogado")),
    publishToPortal: getCheckbox(getProp(page, "Publicar no portal")),
  };
}

let cachedAdapter: NotionAdapter | null = null;

/**
 * Retorna o adaptador do Notion: real se NOTION_TOKEN estiver configurado,
 * caso contrario um mock deterministico (nunca lanca erro por credencial
 * ausente em development/test — apenas em production, via getServerEnv no
 * chamador, que deve tratar isso explicitamente).
 */
export function getNotionAdapter(): NotionAdapter {
  if (cachedAdapter) return cachedAdapter;

  if (!hasCredential("notion")) {
    logger.warn("NOTION_TOKEN ausente — usando MockNotionAdapter");
    cachedAdapter = new MockNotionAdapter();
    return cachedAdapter;
  }

  const env = getServerEnv();
  cachedAdapter = new RealNotionAdapter(env.NOTION_TOKEN as string);
  return cachedAdapter;
}
