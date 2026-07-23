import type { Metadata } from "next";
import { listAllClients } from "@/modules/admin/queries";
import { CreateClientForm } from "@/modules/admin/components/CreateClientForm";
import { CreateInviteForm } from "@/modules/admin/components/CreateInviteForm";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Clientes" };

export default async function AdminClientesPage() {
  const clients = await listAllClients();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Clientes</h1>

      <Card>
        <CardTitle>Novo cliente</CardTitle>
        <div className="mt-3">
          <CreateClientForm />
        </div>
      </Card>

      <div className="space-y-3">
        {clients.map((client) => (
          <Card key={client.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">{client.full_name}</p>
                <p className="text-sm text-slate-500">
                  {client.email} · {client.phone}
                </p>
                <p className="text-xs text-slate-400">
                  Código: {client.internal_code ?? "—"} · Cadastrado em{" "}
                  {formatDate(client.created_at)}
                </p>
              </div>
              <Badge tone={client.status === "Cliente ativo" ? "success" : "neutral"}>
                {client.status}
              </Badge>
            </div>
            <div className="mt-2">
              <CreateInviteForm clientId={client.id} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
