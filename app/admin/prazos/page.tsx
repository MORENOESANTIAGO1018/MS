import type { Metadata } from "next";
import { listAllDeadlines, listAllProcesses } from "@/modules/admin/queries";
import { CreateDeadlineForm } from "@/modules/admin/components/CreateDeadlineForm";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Prazos" };

export default async function AdminPrazosPage() {
  const [deadlines, processes] = await Promise.all([listAllDeadlines(), listAllProcesses()]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Prazos</h1>

      <Card>
        <CardTitle>Novo prazo</CardTitle>
        <div className="mt-3">
          <CreateDeadlineForm
            processes={processes.map((p) => ({
              id: p.id,
              client_id: p.client_id,
              process_number: p.process_number,
            }))}
          />
        </div>
      </Card>

      <div className="space-y-3">
        {deadlines.map((deadline) => (
          <Card key={deadline.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">{deadline.description}</p>
                <p className="text-sm text-slate-500">
                  Vencimento: {formatDate(deadline.due_date)} · Prioridade: {deadline.priority}
                </p>
              </div>
              <Badge tone={deadline.status === "Concluído" ? "success" : "warning"}>
                {deadline.status}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
