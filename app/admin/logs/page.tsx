import type { Metadata } from "next";
import { listAccessLogs, listAuditLogs } from "@/modules/admin/queries";
import { Card, CardTitle } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Logs" };

export default async function AdminLogsPage() {
  const [accessLogs, auditLogs] = await Promise.all([listAccessLogs(), listAuditLogs()]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Logs</h1>
      <p className="text-xs text-slate-500">
        Visível apenas para administradores (RLS restringe leitura destas tabelas).
      </p>

      <Card>
        <CardTitle>Logs de acesso</CardTitle>
        <div className="mt-2 max-h-96 overflow-y-auto">
          <Table className="text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="py-1">Data</th>
                <th>Ação</th>
                <th>Recurso</th>
              </tr>
            </thead>
            <tbody>
              {accessLogs.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-2 text-slate-400">
                    Nenhum registro (ou sem permissão de visualização).
                  </td>
                </tr>
              )}
              {accessLogs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="py-1">{formatDateTime(log.created_at)}</td>
                  <td>{log.action}</td>
                  <td>{log.resource_type}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <Card>
        <CardTitle>Logs de auditoria</CardTitle>
        <div className="mt-2 max-h-96 overflow-y-auto">
          <Table className="text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="py-1">Data</th>
                <th>Ação</th>
                <th>Entidade</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-2 text-slate-400">
                    Nenhum registro (ou sem permissão de visualização).
                  </td>
                </tr>
              )}
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="py-1">{formatDateTime(log.created_at)}</td>
                  <td>{log.action}</td>
                  <td>{log.entity_type}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
