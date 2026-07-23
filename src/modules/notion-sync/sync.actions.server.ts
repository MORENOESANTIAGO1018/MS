"use server";

import { createHash } from "node:crypto";
import { getNotionAdapter } from "@/lib/server/notion";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { logger } from "@/lib/logger";
import { withRetry } from "./retry";
import type { SyncableEntity } from "./allowed-fields";

export interface SyncSummary {
  entity: SyncableEntity;
  status: "success" | "error";
  processed: number;
  errorMessage?: string;
}

async function getLastSuccessfulSync(entity: SyncableEntity): Promise<string | undefined> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("notion_sync_logs")
    .select("finished_at")
    .eq("entity_type", entity)
    .eq("status", "success")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.finished_at ?? undefined;
}

async function logSyncResult(params: {
  entity: SyncableEntity;
  status: "success" | "error" | "skipped";
  startedAt: string;
  errorMessage?: string;
  payloadHash?: string;
}): Promise<void> {
  const admin = getSupabaseAdminClient();
  await admin.from("notion_sync_logs").insert({
    entity_type: params.entity,
    direction: "from_notion",
    status: params.status,
    started_at: params.startedAt,
    finished_at: new Date().toISOString(),
    error_message: params.errorMessage ?? null,
    payload_hash: params.payloadHash ?? null,
  });
}

/**
 * Sincroniza clientes. So grava/atualiza clientes com "Portal ativo"
 * marcado no Notion. Usa notion_page_id para deduplicar (upsert).
 */
async function syncClients(incremental: boolean): Promise<SyncSummary> {
  const startedAt = new Date().toISOString();
  const entity: SyncableEntity = "clients";

  try {
    const since = incremental ? await getLastSuccessfulSync(entity) : undefined;
    const adapter = getNotionAdapter();
    const records = await withRetry(() => adapter.listClients(since));
    const admin = getSupabaseAdminClient();

    let processed = 0;
    for (const record of records) {
      if (!record.portalAtivo) continue; // gate de publicacao (regra inegociavel)

      const { error } = await admin.from("clients").upsert(
        {
          notion_page_id: record.notionPageId,
          full_name: record.fullName,
          email: record.email,
          phone: record.phone,
          status: record.status,
          internal_code: record.internalCode,
        },
        { onConflict: "notion_page_id" },
      );

      if (error) {
        logger.error("Falha ao sincronizar cliente", {
          error: error.message,
          notionPageId: record.notionPageId,
        });
        continue;
      }
      processed += 1;
    }

    const payloadHash = createHash("sha256").update(JSON.stringify(records)).digest("hex");
    await logSyncResult({ entity, status: "success", startedAt, payloadHash });
    return { entity, status: "success", processed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logSyncResult({ entity, status: "error", startedAt, errorMessage: message });
    return { entity, status: "error", processed: 0, errorMessage: message };
  }
}

async function syncProcesses(incremental: boolean): Promise<SyncSummary> {
  const startedAt = new Date().toISOString();
  const entity: SyncableEntity = "processes";

  try {
    const since = incremental ? await getLastSuccessfulSync(entity) : undefined;
    const adapter = getNotionAdapter();
    const records = await withRetry(() => adapter.listProcesses(since));
    const admin = getSupabaseAdminClient();

    let processed = 0;
    for (const record of records) {
      if (!record.publishToPortal) continue;

      const { data: client } = await admin
        .from("clients")
        .select("id")
        .eq("notion_page_id", record.clientNotionPageId)
        .maybeSingle();

      if (!client) {
        logger.warn("Processo ignorado: cliente correspondente ainda nao sincronizado", {
          notionPageId: record.notionPageId,
        });
        continue;
      }

      const { error } = await admin.from("processes").upsert(
        {
          notion_page_id: record.notionPageId,
          client_id: client.id,
          process_number: record.processNumber,
          court: record.court,
          phase: record.phase,
          status: record.status,
          practice_area: record.practiceArea,
          client_summary: record.clientSummary,
          is_visible_to_client: true,
        },
        { onConflict: "notion_page_id" },
      );

      if (error) {
        logger.error("Falha ao sincronizar processo", {
          error: error.message,
          notionPageId: record.notionPageId,
        });
        continue;
      }
      processed += 1;
    }

    const payloadHash = createHash("sha256").update(JSON.stringify(records)).digest("hex");
    await logSyncResult({ entity, status: "success", startedAt, payloadHash });
    return { entity, status: "success", processed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logSyncResult({ entity, status: "error", startedAt, errorMessage: message });
    return { entity, status: "error", processed: 0, errorMessage: message };
  }
}

async function syncProcessUpdates(incremental: boolean): Promise<SyncSummary> {
  const startedAt = new Date().toISOString();
  const entity: SyncableEntity = "processUpdates";

  try {
    const since = incremental ? await getLastSuccessfulSync(entity) : undefined;
    const adapter = getNotionAdapter();
    const records = await withRetry(() => adapter.listProcessUpdates(since));
    const admin = getSupabaseAdminClient();

    let processed = 0;
    for (const record of records) {
      if (!record.publishToPortal || !record.reviewedByLawyer) continue;

      const { data: process } = await admin
        .from("processes")
        .select("id, client_id")
        .eq("notion_page_id", record.processNotionPageId)
        .maybeSingle();

      if (!process) {
        logger.warn("Andamento ignorado: processo correspondente ainda nao sincronizado", {
          notionPageId: record.notionPageId,
        });
        continue;
      }

      const { error } = await admin.from("process_updates").upsert(
        {
          notion_page_id: record.notionPageId,
          process_id: process.id,
          client_id: process.client_id,
          update_date: record.updateDate,
          plain_language_summary: record.plainLanguageSummary,
          classification: record.classification,
          possible_deadline: record.possibleDeadline,
          reviewed_by_lawyer: true,
          is_visible_to_client: true,
          published_at: new Date().toISOString(),
        },
        { onConflict: "notion_page_id" },
      );

      if (error) {
        logger.error("Falha ao sincronizar andamento", {
          error: error.message,
          notionPageId: record.notionPageId,
        });
        continue;
      }
      processed += 1;
    }

    const payloadHash = createHash("sha256").update(JSON.stringify(records)).digest("hex");
    await logSyncResult({ entity, status: "success", startedAt, payloadHash });
    return { entity, status: "success", processed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logSyncResult({ entity, status: "error", startedAt, errorMessage: message });
    return { entity, status: "error", processed: 0, errorMessage: message };
  }
}

/**
 * Orquestrador principal. `incremental=true` usa a data da ultima
 * sincronizacao bem-sucedida por entidade; `incremental=false` busca tudo
 * (util para o primeiro sync ou para reconciliacao manual completa).
 * A ordem importa: clientes antes de processos antes de andamentos, pois
 * cada nivel resolve o pai pelo notion_page_id ja sincronizado.
 */
export async function runNotionSync(incremental = true): Promise<SyncSummary[]> {
  const clientsResult = await syncClients(incremental);
  const processesResult = await syncProcesses(incremental);
  const processUpdatesResult = await syncProcessUpdates(incremental);
  return [clientsResult, processesResult, processUpdatesResult];
}
