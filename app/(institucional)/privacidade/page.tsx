import type { Metadata } from "next";
import { getPublicEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  const env = getPublicEnv();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-serif font-semibold text-brand-navy">
        Política de Privacidade
      </h1>
      <p className="mt-2 text-sm text-slate-500">{env.NEXT_PUBLIC_OFFICE_NAME}</p>

      <div className="prose prose-sm mt-6 max-w-none space-y-4 text-sm text-slate-700">
        <p>
          Esta política descreve como o {env.NEXT_PUBLIC_OFFICE_NAME} trata os dados
          pessoais dos clientes que utilizam o Portal do Cliente, em conformidade com a
          Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e com o sigilo profissional
          previsto no Estatuto da Advocacia.
        </p>
        <h2 className="font-semibold text-slate-900">Dados que tratamos</h2>
        <p>
          Dados cadastrais, processuais, financeiros e documentos relacionados à sua
          representação jurídica, coletados diretamente de você ou no exercício do
          mandato outorgado ao escritório.
        </p>
        <h2 className="font-semibold text-slate-900">Base legal</h2>
        <p>
          Execução de contrato (honorários e representação), cumprimento de obrigação
          legal (guarda de peças processuais) e, quando aplicável, legítimo interesse
          para segurança do próprio portal.
        </p>
        <h2 className="font-semibold text-slate-900">Seus direitos</h2>
        <p>
          Você pode solicitar acesso, correção ou esclarecimentos sobre seus dados
          através da página &ldquo;Meus dados&rdquo; ou da página &ldquo;Suporte&rdquo;
          deste portal.
        </p>
        <h2 className="font-semibold text-slate-900">Segurança</h2>
        <p>
          Utilizamos controles técnicos como controle de acesso por usuário,
          criptografia em trânsito e em repouso, e trilhas de auditoria. Detalhes
          técnicos completos estão documentados internamente em
          SEGURANCA-E-LGPD.md.
        </p>
        <h2 className="font-semibold text-slate-900">Contato</h2>
        <p>
          {env.NEXT_PUBLIC_OFFICE_EMAIL} · {env.NEXT_PUBLIC_OFFICE_PHONE}
        </p>
      </div>
    </main>
  );
}
