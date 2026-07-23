import type { Metadata } from "next";
import { getPortalContext } from "@/modules/clients/current-client";
import { UpdateClientDataForm } from "@/modules/clients/components/UpdateClientDataForm";
import { Card, CardTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Meus dados" };

export default async function MeusDadosPage() {
  const { client } = await getPortalContext();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Meus dados</h1>

      <Card>
        <CardTitle>Dados cadastrais</CardTitle>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Você pode atualizar nome, e-mail, telefone e WhatsApp. Demais dados (CPF/RG,
          status do processo etc.) são gerenciados pelo escritório — entre em contato
          pelo Suporte se precisar corrigir algo.
        </p>
        <div className="mt-2">
          <UpdateClientDataForm
            clientId={client.id}
            fullName={client.full_name}
            email={client.email}
            phone={client.phone}
            whatsapp={client.whatsapp}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Código interno</CardTitle>
        <p className="mt-1 text-sm text-slate-700">{client.internal_code ?? "—"}</p>
      </Card>
    </div>
  );
}
