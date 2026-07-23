import type { Metadata } from "next";
import { getPortalContext } from "@/modules/clients/current-client";
import { listDeadlinesForClient } from "@/modules/deadlines/queries";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Prazos" };

export default async function PrazosPage() {
  const { client } = await getPortalContext();
  const deadlines = await listDeadlinesForClient(client.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Prazos</h1>
      <p className="text-sm text-slate-500">
        Lista informativa. O acompanhamento operacional dos prazos é feito pela nossa
        equipe.
      </p>

      {deadlines.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">Nenhum prazo informado.</p>
        </Card>
      )}

      {deadlines.map((deadline) => (
        <Card key={deadline.id}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-slate-900">{deadline.description}</p>
              <p className="text-sm text-slate-500">
                Data final: {formatDate(deadline.due_date)}
              </p>
            </div>
            <Badge tone={deadline.status === "Concluído" ? "success" : "warning"}>
              {deadline.status}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
