"use server";

import { notifyN8n } from "@/lib/server/n8n-notify";
import { getClientContact } from "@/lib/server/client-contact";

/**
 * Pontes finas entre modules/admin/actions.ts (que deliberadamente não
 * importa lib/server/* — só usa o cliente Supabase no contexto do usuário)
 * e o helper server-only de notificação n8n. Mantém a convenção de que
 * qualquer coisa que toque lib/server/* mora em um arquivo *actions.server.ts.
 * Também enriquece o payload com o contato do cliente, para que o workflow
 * n8n nunca precise de acesso direto ao banco.
 */

export async function notifyProcessUpdatePublished(payload: {
  processUpdateId: string;
  processId: string;
  clientId: string;
}): Promise<void> {
  const contact = await getClientContact(payload.clientId);
  await notifyN8n("andamento-publicado", {
    ...payload,
    clientEmail: contact?.email ?? null,
    clientName: contact?.fullName ?? null,
  });
}

export async function notifyDocumentPublished(payload: {
  documentId: string;
  clientId: string;
  name: string;
}): Promise<void> {
  const contact = await getClientContact(payload.clientId);
  await notifyN8n("documento-publicado", {
    ...payload,
    clientEmail: contact?.email ?? null,
    clientName: contact?.fullName ?? null,
  });
}
