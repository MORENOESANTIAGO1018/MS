import type { Metadata } from "next";
import { getPortalContext } from "@/modules/clients/current-client";
import { listSupportRequestsForClient } from "@/modules/support/queries";
import { SupportRequestForm } from "@/modules/support/components/SupportRequestForm";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import { getPublicEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Suporte" };

export default async function SuportePage() {
  const { client } = await getPortalContext();
  const requests = await listSupportRequestsForClient(client.id);
  const env = getPublicEnv();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Suporte</h1>

      <Card>
        <CardTitle>Fale com o escritório</CardTitle>
        <p className="mt-1 text-sm text-slate-500">
          {env.NEXT_PUBLIC_OFFICE_PHONE} · {env.NEXT_PUBLIC_OFFICE_WHATSAPP} ·{" "}
          {env.NEXT_PUBLIC_OFFICE_EMAIL}
        </p>
        <p className="text-sm text-slate-500">{env.NEXT_PUBLIC_OFFICE_HOURS}</p>
      </Card>

      <Card>
        <CardTitle>Abrir uma solicitação</CardTitle>
        <div className="mt-3">
          <SupportRequestForm clientId={client.id} />
        </div>
      </Card>

      {requests.length > 0 && (
        <Card>
          <CardTitle>Suas solicitações</CardTitle>
          <ul className="mt-3 space-y-3">
            {requests.map((request) => (
              <li key={request.id} className="border-l-2 border-brand-gold pl-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">{request.subject}</p>
                  <Badge tone={request.status === "Aberto" ? "warning" : "success"}>
                    {request.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
                  {formatDateTime(request.created_at)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
