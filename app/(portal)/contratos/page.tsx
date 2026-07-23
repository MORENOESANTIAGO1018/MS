import type { Metadata } from "next";
import { getPortalContext } from "@/modules/clients/current-client";
import { listContractsForClient } from "@/modules/contracts/queries";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Contratos" };

export default async function ContratosPage() {
  const { client } = await getPortalContext();
  const contracts = await listContractsForClient(client.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Contratos</h1>

      {contracts.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">Nenhum contrato disponível.</p>
        </Card>
      )}

      {contracts.map((contract) => (
        <Card key={contract.id}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-slate-900">{contract.contract_number}</p>
              <p className="text-sm text-slate-500">{contract.service_type}</p>
              <p className="mt-1 text-sm text-slate-700">
                Valor total: {formatCurrency(contract.total_value)}
              </p>
              <p className="text-xs text-slate-400">
                Assinado em {formatDate(contract.signed_at)}
              </p>
            </div>
            <Badge tone={contract.status === "Assinado" ? "success" : "warning"}>
              {contract.status}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
