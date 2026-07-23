import type { Metadata } from "next";
import { listAllProcessUpdates, listAllProcesses } from "@/modules/admin/queries";
import { CreateProcessUpdateForm } from "@/modules/admin/components/CreateProcessUpdateForm";
import { GenerateAiSummaryButton } from "@/modules/ai-summaries/components/GenerateAiSummaryButton";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Andamentos" };

export default async function AdminAndamentosPage() {
  const [updates, processes] = await Promise.all([
    listAllProcessUpdates(),
    listAllProcesses(),
  ]);
  const processNumberById = new Map(processes.map((p) => [p.id, p.process_number]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">
        Andamentos processuais
      </h1>

      <Card>
        <CardTitle>Registrar andamento</CardTitle>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          A IA nunca publica sozinha — a publicação exige marcar a caixa abaixo
          explicitamente (regra inegociável).
        </p>
        <CreateProcessUpdateForm
          processes={processes.map((p) => ({
            id: p.id,
            client_id: p.client_id,
            process_number: p.process_number,
          }))}
        />
      </Card>

      <div className="space-y-3">
        {updates.map((update) => (
          <Card key={update.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  {processNumberById.get(update.process_id) ?? update.process_id}
                </p>
                <p className="text-xs text-slate-400">{formatDate(update.update_date)}</p>
                <p className="mt-1 text-sm text-slate-700">{update.plain_language_summary}</p>
              </div>
              <Badge tone={update.is_visible_to_client ? "success" : "neutral"}>
                {update.is_visible_to_client ? "Publicado" : "Não publicado"}
              </Badge>
            </div>
            {update.original_text && (
              <div className="mt-3 border-t border-slate-100 pt-2">
                <GenerateAiSummaryButton processUpdateId={update.id} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
