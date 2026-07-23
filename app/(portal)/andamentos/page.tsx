import type { Metadata } from "next";
import { getPortalContext } from "@/modules/clients/current-client";
import { listProcessUpdatesForClient } from "@/modules/processes/queries";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Andamentos" };

export default async function AndamentosPage() {
  const { client } = await getPortalContext();
  const updates = await listProcessUpdatesForClient(client.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">
        Andamentos processuais
      </h1>

      {updates.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">Nenhum andamento publicado até o momento.</p>
        </Card>
      )}

      {updates.map((update) => (
        <Card key={update.id}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">{formatDate(update.update_date)}</p>
            {update.classification && <Badge tone="info">{update.classification}</Badge>}
          </div>
          <p className="mt-2 text-sm text-slate-700">{update.plain_language_summary}</p>
        </Card>
      ))}
    </div>
  );
}
