import type { Metadata } from "next";
import { getPortalContext } from "@/modules/clients/current-client";
import { listHearingsForClient } from "@/modules/hearings/queries";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audiências" };

export default async function AudienciasPage() {
  const { client } = await getPortalContext();
  const hearings = await listHearingsForClient(client.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Audiências</h1>

      {hearings.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">Nenhuma audiência agendada.</p>
        </Card>
      )}

      {hearings.map((hearing) => (
        <Card key={hearing.id}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-slate-900">{hearing.title}</p>
              <p className="text-sm text-slate-500">
                {formatDateTime(hearing.scheduled_at)} · {hearing.modality}
              </p>
              {hearing.location && (
                <p className="text-sm text-slate-500">{hearing.location}</p>
              )}
              {hearing.access_link && (
                <a
                  href={hearing.access_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-brand-navy underline"
                >
                  Link de acesso
                </a>
              )}
            </div>
            <Badge tone={hearing.status === "Cancelada" ? "danger" : "info"}>
              {hearing.status}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
