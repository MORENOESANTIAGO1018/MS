import type { Metadata } from "next";
import Link from "next/link";
import { getPortalContext } from "@/modules/clients/current-client";
import { listProcessesForClient } from "@/modules/processes/queries";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Meus processos" };

export default async function ProcessosPage() {
  const { client } = await getPortalContext();
  const processes = await listProcessesForClient(client.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Meus processos</h1>

      {processes.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">
            Nenhum processo publicado no portal até o momento.
          </p>
        </Card>
      )}

      {processes.map((process) => (
        <Link key={process.id} href={`/processos/${process.id}`}>
          <Card className="transition hover:border-brand-navy">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">{process.process_number}</p>
                <p className="text-sm text-slate-500">
                  {process.practice_area} · {process.phase}
                </p>
              </div>
              <Badge tone={process.status === "Ativo" ? "success" : "neutral"}>
                {process.status}
              </Badge>
            </div>
            {process.client_summary && (
              <p className="mt-2 text-sm text-slate-700">{process.client_summary}</p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Atualizado em {formatDate(process.updated_at)}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
