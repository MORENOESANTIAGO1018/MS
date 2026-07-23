import type { Metadata } from "next";
import { listAllHearings, listAllProcesses } from "@/modules/admin/queries";
import { CreateHearingForm } from "@/modules/admin/components/CreateHearingForm";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audiências" };

export default async function AdminAudienciasPage() {
  const [hearings, processes] = await Promise.all([listAllHearings(), listAllProcesses()]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Audiências</h1>

      <Card>
        <CardTitle>Nova audiência</CardTitle>
        <div className="mt-3">
          <CreateHearingForm
            processes={processes.map((p) => ({
              id: p.id,
              client_id: p.client_id,
              process_number: p.process_number,
            }))}
          />
        </div>
      </Card>

      <div className="space-y-3">
        {hearings.map((hearing) => (
          <Card key={hearing.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">{hearing.title}</p>
                <p className="text-sm text-slate-500">
                  {formatDateTime(hearing.scheduled_at)} · {hearing.modality}
                </p>
              </div>
              <Badge tone={hearing.is_visible_to_client ? "success" : "neutral"}>
                {hearing.is_visible_to_client ? "Publicada" : "Não publicada"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
