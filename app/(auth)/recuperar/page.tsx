import type { Metadata } from "next";
import { PasswordResetForm } from "@/modules/auth/components/PasswordResetForm";

export const metadata: Metadata = { title: "Recuperar acesso" };
// Ver comentário em app/(institucional)/privacidade/page.tsx (nonce de CSP
// por requisição exige renderização dinâmica).
export const dynamic = "force-dynamic";

export default function PasswordResetPage() {
  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        Informe o e-mail cadastrado para receber instruções de recuperação de acesso.
      </p>
      <PasswordResetForm />
    </div>
  );
}
