"use client";

import { useState, useTransition } from "react";
import { updateProcess } from "@/modules/admin/actions";
import { Button } from "@/components/ui/Button";

interface Props {
  processId: string;
  phase: string | null;
  status: string;
  clientSummary: string | null;
  isVisibleToClient: boolean;
}

const PHASES = [
  "Análise inicial",
  "Elaboração da inicial",
  "Distribuído",
  "Aguardando citação",
  "Contestação",
  "Réplica",
  "Instrução",
  "Sentença",
  "Recurso",
  "Cumprimento de sentença",
  "Execução",
  "Suspenso",
  "Encerrado",
];

export function UpdateProcessForm({
  processId,
  phase,
  status,
  clientSummary,
  isVisibleToClient,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await updateProcess(formData);
      setMessage(result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <input type="hidden" name="processId" value={processId} />
      <div className="flex flex-wrap gap-2">
        <select
          name="phase"
          defaultValue={phase ?? PHASES[0]}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
        >
          {PHASES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
        >
          <option value="Ativo">Ativo</option>
          <option value="Suspenso">Suspenso</option>
          <option value="Arquivado">Arquivado</option>
          <option value="Encerrado">Encerrado</option>
          <option value="Em recurso">Em recurso</option>
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input
            type="checkbox"
            name="isVisibleToClient"
            defaultChecked={isVisibleToClient}
          />
          Publicar no portal
        </label>
      </div>
      <textarea
        name="clientSummary"
        defaultValue={clientSummary ?? ""}
        placeholder="Resumo para o cliente"
        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
      />
      <Button type="submit" variant="secondary" disabled={isPending} className="text-xs">
        {isPending ? "Salvando..." : "Salvar alterações"}
      </Button>
      {message && <span className="ml-2 text-xs text-slate-600">{message}</span>}
    </form>
  );
}
