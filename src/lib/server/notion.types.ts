/** Tipos compartilhados entre o adaptador real e o mock do Notion. */

export interface NotionClientRecord {
  notionPageId: string;
  lastEditedTime: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  internalCode: string | null;
  documentLast4: string | null;
  portalAtivo: boolean;
}

export interface NotionProcessRecord {
  notionPageId: string;
  lastEditedTime: string;
  clientNotionPageId: string;
  processNumber: string;
  court: string | null;
  phase: string | null;
  status: string;
  practiceArea: string | null;
  clientSummary: string | null;
  publishToPortal: boolean;
}

export interface NotionProcessUpdateRecord {
  notionPageId: string;
  lastEditedTime: string;
  processNotionPageId: string;
  updateDate: string;
  plainLanguageSummary: string | null;
  classification: string | null;
  possibleDeadline: string | null;
  reviewedByLawyer: boolean;
  publishToPortal: boolean;
}

/** Interface comum implementada pelo adaptador real e pelo mock. */
export interface NotionAdapter {
  listClients(sinceIso?: string): Promise<NotionClientRecord[]>;
  listProcesses(sinceIso?: string): Promise<NotionProcessRecord[]>;
  listProcessUpdates(sinceIso?: string): Promise<NotionProcessUpdateRecord[]>;
}
