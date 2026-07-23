import type { Metadata } from "next";
import { getPublicEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  const env = getPublicEnv();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-serif font-semibold text-brand-navy">Termos de Uso</h1>
      <p className="mt-2 text-sm text-slate-500">{env.NEXT_PUBLIC_OFFICE_NAME}</p>

      <div className="prose prose-sm mt-6 max-w-none space-y-4 text-sm text-slate-700">
        <p>
          O acesso ao Portal do Cliente é pessoal, intransferível e concedido somente
          mediante convite do {env.NEXT_PUBLIC_OFFICE_NAME}. Não é permitido cadastro
          público.
        </p>
        <h2 className="font-semibold text-slate-900">Uso adequado</h2>
        <p>
          As informações disponibilizadas têm caráter informativo e não substituem a
          comunicação direta com a equipe responsável pelo seu caso. Nenhuma informação
          publicada no portal constitui garantia de resultado processual.
        </p>
        <h2 className="font-semibold text-slate-900">Responsabilidades do usuário</h2>
        <p>
          Mantenha sua senha em sigilo, encerre a sessão em dispositivos compartilhados e
          comunique imediatamente o escritório em caso de suspeita de acesso indevido.
        </p>
        <h2 className="font-semibold text-slate-900">Documentos enviados</h2>
        <p>
          Ao enviar documentos pelo portal, você declara que possui o direito de
          compartilhá-los e que são verdadeiros.
        </p>
        <h2 className="font-semibold text-slate-900">Alterações</h2>
        <p>
          Estes termos podem ser atualizados periodicamente. A versão vigente estará
          sempre disponível nesta página.
        </p>
      </div>
    </main>
  );
}
