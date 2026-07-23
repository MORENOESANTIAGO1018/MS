import type { Metadata } from "next";
import { LoginForm } from "@/modules/auth/components/LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const redirectTo =
    params.redirect && params.redirect.startsWith("/") ? params.redirect : "/painel";

  return (
    <div>
      {params.reason === "idle" && (
        <p className="mb-4 rounded-lg bg-status-warning/10 p-3 text-sm text-status-warning">
          Sua sessão expirou por inatividade. Entre novamente.
        </p>
      )}
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
