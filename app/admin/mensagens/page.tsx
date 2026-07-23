import type { Metadata } from "next";
import { listAllMessages, listAllClients } from "@/modules/admin/queries";
import { MessageThread } from "@/modules/messages/components/MessageThread";
import { Card, CardTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Mensagens" };

export default async function AdminMensagensPage() {
  const [messages, clients] = await Promise.all([listAllMessages(), listAllClients()]);
  const clientNameById = new Map(clients.map((c) => [c.id, c.full_name]));

  const clientIdsWithMessages = Array.from(new Set(messages.map((m) => m.client_id)));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Mensagens</h1>

      {clientIdsWithMessages.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">Nenhuma conversa até o momento.</p>
        </Card>
      )}

      {clientIdsWithMessages.map((clientId) => {
        const threadMessages = messages
          .filter((m) => m.client_id === clientId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const unread = threadMessages.filter(
          (m) => !m.read_at && m.sender_role === "client",
        ).length;

        return (
          <Card key={clientId}>
            <CardTitle>
              {clientNameById.get(clientId) ?? "Cliente"}{" "}
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-status-danger/10 px-2 py-0.5 text-xs text-status-danger">
                  {unread} não lida(s)
                </span>
              )}
            </CardTitle>
            <div className="mt-3">
              <MessageThread clientId={clientId} messages={threadMessages} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
