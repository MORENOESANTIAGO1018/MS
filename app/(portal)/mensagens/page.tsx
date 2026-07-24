import type { Metadata } from "next";
import { getPortalContext } from "@/modules/clients/current-client";
import { listMessagesForClient } from "@/modules/messages/queries";
import { markMessagesAsRead } from "@/modules/messages/actions.server";
import { MessageThread } from "@/modules/messages/components/MessageThread";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Mensagens" };

export default async function MensagensPage() {
  const { client } = await getPortalContext();
  const messages = await listMessagesForClient(client.id);
  await markMessagesAsRead(client.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Mensagens</h1>
      <Card>
        <MessageThread clientId={client.id} messages={messages} />
      </Card>
    </div>
  );
}
