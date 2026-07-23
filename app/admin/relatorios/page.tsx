import type { Metadata } from "next";
import { listAllProcesses, listAllFinancialEntries, listAllClients } from "@/modules/admin/queries";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Relatórios" };

export default async function AdminRelatoriosPage() {
  const [processes, financialEntries, clients] = await Promise.all([
    listAllProcesses(),
    listAllFinancialEntries(),
    listAllClients(),
  ]);

  const processesByArea = processes.reduce<Record<string, number>>((acc, p) => {
    const area = p.practice_area ?? "Sem área";
    acc[area] = (acc[area] ?? 0) + 1;
    return acc;
  }, {});

  const clientsByStatus = clients.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalReceived = financialEntries
    .filter((e) => e.status === "pago")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const totalPending = financialEntries
    .filter((e) => e.status !== "pago" && e.status !== "cancelado")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Relatórios</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Processos por área jurídica</CardTitle>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {Object.entries(processesByArea).map(([area, count]) => (
              <li key={area} className="flex justify-between">
                <span>{area}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Clientes por status</CardTitle>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {Object.entries(clientsByStatus).map(([status, count]) => (
              <li key={status} className="flex justify-between">
                <span>{status}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitle>Financeiro consolidado</CardTitle>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500">Total recebido</p>
            <p className="text-xl font-semibold text-status-success">
              {formatCurrency(totalReceived)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total pendente</p>
            <p className="text-xl font-semibold text-status-warning">
              {formatCurrency(totalPending)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
