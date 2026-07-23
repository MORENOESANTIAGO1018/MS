import type { Metadata } from "next";
import { listAllFinancialEntries, listAllClients } from "@/modules/admin/queries";
import { CreateFinancialEntryForm } from "@/modules/admin/components/CreateFinancialEntryForm";
import { UpdateFinancialStatusForm } from "@/modules/admin/components/UpdateFinancialStatusForm";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Financeiro" };

export default async function AdminFinanceiroPage() {
  const [entries, clients] = await Promise.all([listAllFinancialEntries(), listAllClients()]);
  const clientNameById = new Map(clients.map((c) => [c.id, c.full_name]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Financeiro</h1>

      <Card>
        <CardTitle>Novo lançamento</CardTitle>
        <div className="mt-3">
          <CreateFinancialEntryForm clients={clients.map((c) => ({ id: c.id, full_name: c.full_name }))} />
        </div>
      </Card>

      <div className="space-y-3">
        {entries.map((entry) => (
          <Card key={entry.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">{entry.description}</p>
                <p className="text-sm text-slate-500">
                  {clientNameById.get(entry.client_id)} · {formatCurrency(entry.amount)} · Vence
                  em {formatDate(entry.due_date)}
                </p>
              </div>
              <UpdateFinancialStatusForm entryId={entry.id} status={entry.status} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
