import type { Metadata } from "next";
import {
  listPendingAiSummaries,
  listAllProcessUpdates,
  listAllProcesses,
  listAllClients,
} from "@/modules/admin/queries";
import { ReviewAiSummaryForm } from "@/modules/ai-summaries/components/ReviewAiSummaryForm";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Resumos por IA" };

export default async function AdminResumosIaPage() {
  const [summaries, updates, processes, clients] = await Promise.all([
    listPendingAiSummaries(),
    listAllProcessUpdates(),
    listAllProcesses(),
    listAllClients(),
  ]);

  const updateById = new Map(updates.map((u) => [u.id, u]));
  const processNumberById = new Map(processes.map((p) => [p.id, p.process_number]));
  const clientNameById = new Map(clients.map((c) => [c.id, c.full_name]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Resumos por IA</h1>
      <p className="text-xs text-slate-500">
        A IA nunca publica nada sozinha (regra inegociável). Toda sugestão fica pendente aqui até
        que um advogado ou staff revise o texto, edite se necessário, e decida explicitamente
        publicar ou não no portal do cliente.
      </p>

      <div className="space-y-4">
        {summaries.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">Nenhuma sugestão pendente de revisão.</p>
          </Card>
        )}
        {summaries.map((summary) => {
          const update = updateById.get(summary.process_update_id);
          return (
            <Card key={summary.id}>
              <CardTitle>
                {update ? processNumberById.get(update.process_id) ?? update.process_id : "Andamento"}
                {" — "}
                {clientNameById.get(summary.client_id) ?? "Cliente"}
              </CardTitle>
              <p className="mt-1 text-xs text-slate-400">
                Gerado por {summary.model} ({summary.model_version}) em{" "}
                {formatDate(summary.created_at)}
              </p>
              {update?.original_text && (
                <details className="mt-2 text-xs text-slate-500">
                  <summary className="cursor-pointer">Texto original</summary>
                  <p className="mt-1 whitespace-pre-wrap">{update.original_text}</p>
                </details>
              )}
              {summary.sensitive_flags.length > 0 && (
                <p className="mt-2 text-xs text-status-danger">
                  Sinalizado: {summary.sensitive_flags.join(", ")}
                </p>
              )}
              <div className="mt-3">
                <ReviewAiSummaryForm
                  summaryId={summary.id}
                  suggestedPlainLanguageSummary={summary.plain_language_summary}
                  suggestedClassification={summary.classification}
                  suggestedPossibleDeadline={summary.possible_deadline}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
