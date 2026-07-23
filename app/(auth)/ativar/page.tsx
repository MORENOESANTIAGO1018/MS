import type { Metadata } from "next";
import { ActivationForm } from "@/modules/auth/components/ActivationForm";

export const metadata: Metadata = { title: "Ativar conta" };

export default async function ActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string }>;
}) {
  const params = await searchParams;
  const clientAccessId = params.convite;

  if (!clientAccessId) {
    return (
      <p className="text-sm text-status-danger">
        Link de ativação inválido. Solicite um novo convite ao escritório.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        Informe o código de ativação recebido e defina sua senha de acesso.
      </p>
      <ActivationForm clientAccessId={clientAccessId} />
    </div>
  );
}
