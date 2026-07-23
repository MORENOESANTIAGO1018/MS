import type { Metadata } from "next";
import { getPublicEnv } from "@/lib/env";
import { Card, CardTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Configurações" };

export default function AdminConfiguracoesPage() {
  const env = getPublicEnv();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Configurações</h1>

      <Card>
        <CardTitle>Dados institucionais exibidos no portal</CardTitle>
        <p className="mt-1 text-xs text-slate-500">
          Estes valores vêm de variáveis de ambiente (NEXT_PUBLIC_OFFICE_*) e são
          alterados no provedor de hospedagem (Vercel), não nesta tela — ver
          VARIAVEIS-DE-AMBIENTE.md.
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Nome do escritório</dt>
            <dd className="text-slate-900">{env.NEXT_PUBLIC_OFFICE_NAME}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Telefone</dt>
            <dd className="text-slate-900">{env.NEXT_PUBLIC_OFFICE_PHONE || "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">WhatsApp</dt>
            <dd className="text-slate-900">{env.NEXT_PUBLIC_OFFICE_WHATSAPP || "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">E-mail</dt>
            <dd className="text-slate-900">{env.NEXT_PUBLIC_OFFICE_EMAIL || "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Endereço</dt>
            <dd className="text-slate-900">{env.NEXT_PUBLIC_OFFICE_ADDRESS || "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Horário de atendimento</dt>
            <dd className="text-slate-900">{env.NEXT_PUBLIC_OFFICE_HOURS || "—"}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardTitle>Segurança e sessão</CardTitle>
        <p className="mt-1 text-sm text-slate-600">
          Limite de tentativas de login, expiração de sessão por inatividade e validade
          do código de ativação são configurados via variáveis de ambiente do servidor
          (não expostas nesta tela por segurança). Ver VARIAVEIS-DE-AMBIENTE.md e
          CHECKLIST-DE-PRODUCAO.md.
        </p>
      </Card>
    </div>
  );
}
