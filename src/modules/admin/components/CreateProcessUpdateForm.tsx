"use client";

import { useRef, useState, useTransition } from "react";
import { createProcessUpdate } from "@/modules/admin/actions";
import { Button } from "@/components/ui/Button";

interface Props {
  processes: { id: string; client_id: string; process_number: string }[];
}

export function CreateProcessUpdateForm({ processes }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState("");

  const selectedProcess = processes.find((p) => p.id === selectedProcessId);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await createProcessUpdate(formData);
      setMessage(result.message);
      if (result.success) {
        formRef.current?.reset();
        setSelectedProcessId("");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="clientId" value={selectedProcess?.client_id ?? ""} />
      <select
        name="processId"
        required
        value={selectedProcessId}
        onChange={(e) => setSelectedProcessId(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Selecione o processo</option>
        {processes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.process_number}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="date"
          name="updateDate"
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select name="classification" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="Despacho">Despacho</option>
          <option value="Decisão">Decisão</option>
          <option value="Sentença">Sentença</option>
          <option value="Publicação">Publicação</option>
          <option value="Intimação">Intimação</option>
          <option value="Citação">Citação</option>
          <option value="Certidão">Certidão</option>
          <option value="Outro">Outro</option>
        </select>
      </div>
      <textarea
        name="plainLanguageSummary"
        required
        placeholder="Resumo em linguagem simples para o cliente"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <textarea
        name="originalText"
        placeholder="Texto original/técnico (opcional) — se preenchido, permite gerar um resumo sugerido por IA em Resumos por IA, sempre sujeito a revisão e aprovação humana antes de publicar"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="publishToPortal" />
        Publicar no portal imediatamente
      </label>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Registrar andamento"}
      </Button>
      {message && <span className="ml-3 text-sm text-slate-600">{message}</span>}
    </form>
  );
}
