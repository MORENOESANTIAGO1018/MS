"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

/**
 * Boundary de erro de rota. Nunca exibe stack trace ou detalhes internos ao
 * usuario — apenas uma mensagem generica em portugues, conforme regra de
 * tratamento seguro de erros (SEGURANCA-E-LGPD.md / FASE 13).
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Erro nao tratado em rota", { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-muted px-6 text-center">
      <h1 className="text-xl font-semibold text-slate-900">
        Ocorreu um erro inesperado
      </h1>
      <p className="max-w-md text-sm text-slate-600">
        Nossa equipe já foi notificada. Tente novamente em instantes ou entre em
        contato com o escritório se o problema persistir.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-brand-navy px-5 py-2 text-sm font-medium text-white hover:bg-brand-navy-light"
      >
        Tentar novamente
      </button>
    </main>
  );
}
