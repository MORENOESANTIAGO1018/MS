import type { Metadata } from "next";
import { listAllClients, listAllProcesses } from "@/modules/admin/queries";
import { CreateProcessForm } from "@/modules/admin/components/CreateProcessForm";
import { UpdateProcessForm } from "@/modules/admin/components/UpdateProcessForm";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Processos" };

export default async function AdminProcessosPage() {
  const [processes, clients] = await Promise.all([listAllProcesses(), listAllClients()]);
  const clientNameById = new Map(clients.map((c) => [c.id, c.full_name]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Processos</h1>

      <Card>
        <CardTitle>Novo processo</CardTitle>
        <div className="mt-3">
          <CreateProcessForm clients={clients.map((c) => ({ id: c.id, full_name: c.full_name }))} />
        </div>
      </Card>

      <div className="space-y-3">
        {processes.map((process) => (
          <Card key={process.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">{process.process_number}</p>
                <p className="text-sm text-slate-500">
                  {clientNameById.get(process.client_id) ?? "Cliente não encontrado"} ·{" "}
                  {process.practice_area}
                </p>
              </div>
              <div className="flex gap-2">
                {process.is_visible_to_client && <Badge tone="info">Publicado</Badge>}
                <Badge tone={process.status === "Ativo" ? "success" : "neutral"}>
                  {process.status}
                </Badge>
              </div>
            </div>
            <UpdateProcessForm
              processId={process.id}
              phase={process.phase}
              status={process.status}
              clientSummary={process.client_summary}
              isVisibleToClient={process.is_visible_to_client}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
