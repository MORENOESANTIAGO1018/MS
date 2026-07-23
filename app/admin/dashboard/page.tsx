import type { Metadata } from "next";
import { getDashboardStats } from "@/modules/admin/queries";
import { Card, CardTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Dashboard administrativo" };

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const tiles = [
    { label: "Clientes ativos", value: stats.activeClients, of: stats.totalClients },
    { label: "Processos ativos", value: stats.activeProcesses, of: stats.totalProcesses },
    { label: "Prazos nos próximos 7 dias", value: stats.upcomingDeadlines },
    { label: "Audiências nos próximos 7 dias", value: stats.upcomingHearings },
    { label: "Parcelas vencidas", value: stats.overdueFinancial },
    { label: "Documentos pendentes de revisão", value: stats.pendingDocuments },
    { label: "Resumos de IA aguardando revisão", value: stats.pendingAiSummaries },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">
        Visão geral do escritório
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardTitle>{tile.label}</CardTitle>
            <p className="mt-2 text-3xl font-semibold text-brand-navy">
              {tile.value}
              {tile.of !== undefined && (
                <span className="text-base font-normal text-slate-400"> / {tile.of}</span>
              )}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
