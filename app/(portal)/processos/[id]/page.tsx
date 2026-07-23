import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProcessDetail, listProcessUpdatesForProcess } from "@/modules/processes/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Detalhes do processo" };

export default async function ProcessoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const process = await getProcessDetail(id);

  if (!process) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const [updates, { data: hearings }, { data: deadlines }, { data: documents }] =
    await Promise.all([
      listProcessUpdatesForProcess(id),
      supabase.from("hearings").select("*").eq("process_id", id).order("scheduled_at"),
      supabase.from("deadlines").select("*").eq("process_id", id).order("due_date"),
      supabase.from("documents").select("*").eq("process_id", id),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-serif font-semibold text-brand-navy">
          {process.process_number}
        </h1>
        <p className="text-sm text-slate-500">
          {process.practice_area} · {process.court} · {process.phase}
        </p>
      </div>

      <Card>
        <CardTitle>Resumo</CardTitle>
        <p className="mt-2 text-sm text-slate-700">
          {process.client_summary ?? "Ainda não há um resumo publicado para este processo."}
        </p>
      </Card>

      <Card>
        <CardTitle>Andamentos publicados</CardTitle>
        <ul className="mt-3 space-y-3">
          {updates.length === 0 && (
            <li className="text-sm text-slate-500">Nenhum andamento publicado.</li>
          )}
          {updates.map((update) => (
            <li key={update.id} className="border-l-2 border-brand-gold pl-3">
              <p className="text-xs text-slate-400">{formatDate(update.update_date)}</p>
              <p className="text-sm text-slate-700">{update.plain_language_summary}</p>
              {update.classification && (
                <Badge tone="info" className="mt-1">
                  {update.classification}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Audiências</CardTitle>
          <ul className="mt-2 space-y-2">
            {(hearings ?? []).length === 0 && (
              <li className="text-sm text-slate-500">Nenhuma audiência agendada.</li>
            )}
            {(hearings ?? []).map((hearing) => (
              <li key={hearing.id} className="text-sm text-slate-700">
                {formatDate(hearing.scheduled_at)} — {hearing.title}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Prazos</CardTitle>
          <ul className="mt-2 space-y-2">
            {(deadlines ?? []).length === 0 && (
              <li className="text-sm text-slate-500">Nenhum prazo informado.</li>
            )}
            {(deadlines ?? []).map((deadline) => (
              <li key={deadline.id} className="text-sm text-slate-700">
                {formatDate(deadline.due_date)} — {deadline.description}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitle>Documentos deste processo</CardTitle>
        <ul className="mt-2 space-y-2">
          {(documents ?? []).length === 0 && (
            <li className="text-sm text-slate-500">Nenhum documento vinculado.</li>
          )}
          {(documents ?? []).map((doc) => (
            <li key={doc.id} className="text-sm text-slate-700">
              {doc.name}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
