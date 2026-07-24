import type { Metadata } from "next";
import { getPortalContext } from "@/modules/clients/current-client";
import { listFinancialEntriesForClient, FINANCIAL_STATUS_LABELS } from "@/modules/financial/queries";
import { DownloadReceiptButton } from "@/modules/financial/components/DownloadReceiptButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/format";
import type { FinancialStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Financeiro" };

const STATUS_TONE: Record<FinancialStatus, "success" | "warning" | "danger" | "info" | "neutral"> = {
  pago: "success",
  pendente: "warning",
  a_vencer: "info",
  vencido: "danger",
  renegociado: "info",
  cancelado: "neutral",
};

export default async function FinanceiroPage() {
  const { client } = await getPortalContext();
  const entries = await listFinancialEntriesForClient(client.id);

  const totalPendente = entries
    .filter((e) => e.status !== "pago" && e.status !== "cancelado")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Financeiro</h1>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">Saldo pendente</p>
            <p className="text-2xl font-semibold text-brand-navy">
              {formatCurrency(totalPendente)}
            </p>
          </div>
          <a
            href="/api/financial-entries/statement"
            className="text-xs text-brand-navy underline underline-offset-2"
          >
            Baixar extrato em PDF
          </a>
        </div>
      </Card>

      {entries.length === 0 && <EmptyState title="Nenhum lançamento financeiro" />}

      {entries.map((entry) => (
        <Card key={entry.id}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-slate-900">{entry.description}</p>
              <p className="text-sm text-slate-500">
                Vencimento: {formatDate(entry.due_date)}
                {entry.paid_at && ` · Pago em ${formatDate(entry.paid_at)}`}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {formatCurrency(entry.amount)}
              </p>
            </div>
            <Badge tone={STATUS_TONE[entry.status]}>
              {FINANCIAL_STATUS_LABELS[entry.status]}
            </Badge>
          </div>
          {entry.receipt_storage_path && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <DownloadReceiptButton financialEntryId={entry.id} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
