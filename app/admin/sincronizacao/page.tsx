import type { Metadata } from "next";
import { listNotionSyncLogs } from "@/modules/admin/queries";
import { TriggerNotionSyncButton } from "@/modules/admin/components/TriggerNotionSyncButton";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Sincronização Notion" };

export default async function AdminSincronizacaoPage() {
  const logs = await listNotionSyncLogs();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Sincronização com o Notion</h1>
      <p className="text-xs text-slate-500">
        A sincronização traz clientes, processos e andamentos do Notion, respeitando sempre os
        campos &ldquo;Portal ativo&rdquo; / &ldquo;Publicar no portal&rdquo; / &ldquo;Revisado por advogado&rdquo;
        — nada é exibido ao cliente sem essas marcações no Notion. A automação n8n também pode
        disparar este processo periodicamente via webhook autenticado por segredo compartilhado.
      </p>

      <Card>
        <CardTitle>Disparo manual</CardTitle>
        <div className="mt-2">
          <TriggerNotionSyncButton />
        </div>
      </Card>

      <Card>
        <CardTitle>Histórico de sincronizações</CardTitle>
        <div className="mt-2 max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="py-1">Início</th>
                <th>Entidade</th>
                <th>Status</th>
                <th>Erro</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-2 text-slate-400">
                    Nenhuma sincronização registrada ainda.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="py-1">{formatDateTime(log.started_at)}</td>
                  <td>{log.entity_type}</td>
                  <td>{log.status}</td>
                  <td className="text-status-danger">{log.error_message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
