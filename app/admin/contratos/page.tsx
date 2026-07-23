import type { Metadata } from "next";
import { listAllContracts, listAllClients } from "@/modules/admin/queries";
import { CreateContractForm } from "@/modules/admin/components/CreateContractForm";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Contratos" };

export default async function AdminContratosPage() {
  const [contracts, clients] = await Promise.all([listAllContracts(), listAllClients()]);
  const clientNameById = new Map(clients.map((c) => [c.id, c.full_name]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Contratos</h1>

      <Card>
        <CardTitle>Novo contrato</CardTitle>
        <div className="mt-3">
          <CreateContractForm clients={clients.map((c) => ({ id: c.id, full_name: c.full_name }))} />
        </div>
      </Card>

      <div className="space-y-3">
        {contracts.map((contract) => (
          <Card key={contract.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">{contract.contract_number}</p>
                <p className="text-sm text-slate-500">
                  {clientNameById.get(contract.client_id)} · {formatCurrency(contract.total_value)}
                </p>
              </div>
              <Badge tone={contract.status === "Assinado" ? "success" : "neutral"}>
                {contract.status}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
