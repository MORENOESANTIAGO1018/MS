import type { Metadata } from "next";
import Link from "next/link";
import { getPortalContext } from "@/modules/clients/current-client";
import { listProcessesForClient } from "@/modules/processes/queries";
import { getNextHearingForClient } from "@/modules/hearings/queries";
import { listPendingFinancialEntriesForClient } from "@/modules/financial/queries";
import { listRecentDocumentsForClient } from "@/modules/documents/queries";
import { countUnreadMessagesForClient } from "@/modules/messages/queries";
import { listNotificationsForClient } from "@/modules/notifications/queries";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelPage() {
  const { client } = await getPortalContext();

  const [processes, nextHearing, pendingFinancial, recentDocuments, unreadMessages, notifications] =
    await Promise.all([
      listProcessesForClient(client.id),
      getNextHearingForClient(client.id),
      listPendingFinancialEntriesForClient(client.id),
      listRecentDocumentsForClient(client.id),
      countUnreadMessagesForClient(client.id, "client"),
      listNotificationsForClient(client.id),
    ]);

  const activeProcesses = processes.filter((p) => p.status === "Ativo");
  const lastUpdatedProcess = [...processes].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-brand-navy">
          Olá, {client.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500">
          Última atualização: {formatDate(client.updated_at)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardTitle>Processos ativos</CardTitle>
          <p className="mt-2 text-3xl font-semibold text-brand-navy">
            {activeProcesses.length}
          </p>
        </Card>
        <Card>
          <CardTitle>Próxima audiência</CardTitle>
          <p className="mt-2 text-sm text-slate-700">
            {nextHearing ? formatDate(nextHearing.scheduled_at) : "Nenhuma agendada"}
          </p>
        </Card>
        <Card>
          <CardTitle>Parcelas pendentes</CardTitle>
          <p className="mt-2 text-3xl font-semibold text-brand-navy">
            {pendingFinancial.length}
          </p>
        </Card>
        <Card>
          <CardTitle>Mensagens não lidas</CardTitle>
          <p className="mt-2 text-3xl font-semibold text-brand-navy">
            {unreadMessages}
          </p>
        </Card>
      </div>

      <Card>
        <CardTitle>Último andamento publicado</CardTitle>
        {lastUpdatedProcess ? (
          <div className="mt-2">
            <p className="text-sm text-slate-700">{lastUpdatedProcess.client_summary}</p>
            <Link
              href={`/processos/${lastUpdatedProcess.id}`}
              className="mt-2 inline-block text-sm text-brand-navy underline"
            >
              Ver processo {lastUpdatedProcess.process_number}
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Nenhum andamento publicado ainda.</p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Documentos recentes</CardTitle>
          <ul className="mt-2 space-y-2">
            {recentDocuments.length === 0 && (
              <li className="text-sm text-slate-500">Nenhum documento disponível.</li>
            )}
            {recentDocuments.map((doc) => (
              <li key={doc.id} className="text-sm text-slate-700">
                {doc.name}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Avisos do escritório</CardTitle>
          <ul className="mt-2 space-y-2">
            {notifications.length === 0 && (
              <li className="text-sm text-slate-500">Nenhum aviso no momento.</li>
            )}
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id} className="text-sm text-slate-700">
                <span className="font-medium">{n.title}</span>
                {!n.read_at && (
                  <Badge tone="info" className="ml-2">
                    Novo
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
