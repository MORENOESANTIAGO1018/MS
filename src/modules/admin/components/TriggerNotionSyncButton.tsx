"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface SyncResult {
  entity: string;
  status: "success" | "error";
  processed: number;
  errorMessage?: string;
}

/**
 * Dispara POST /api/notion/sync autenticado pela sessao do usuario staff
 * (sem segredo compartilhado — esse caminho e reservado para a automacao
 * n8n). Mostra o resumo retornado e recarrega a lista de logs.
 */
export function TriggerNotionSyncButton() {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<SyncResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const trigger = () => {
    setError(null);
    setResults(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/notion/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incremental: true }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Falha na sincronização.");
          return;
        }
        setResults(data.results);
        router.refresh();
      } catch {
        setError("Falha de rede ao chamar a sincronização.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={trigger}
        className="rounded bg-brand-navy px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Sincronizando..." : "Sincronizar agora"}
      </button>
      {error && <p className="text-xs text-status-danger">{error}</p>}
      {results && (
        <ul className="text-xs text-slate-600">
          {results.map((result) => (
            <li key={result.entity}>
              {result.entity}: {result.status === "success" ? `${result.processed} registro(s)` : `erro — ${result.errorMessage}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
