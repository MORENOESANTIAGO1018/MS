"use client";

import { useRef, useState, useTransition } from "react";
import { createDeadline } from "@/modules/admin/actions";
import { Button } from "@/components/ui/Button";

interface Props {
  processes: { id: string; client_id: string; process_number: string }[];
}

export function CreateDeadlineForm({ processes }: Props) {
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
      const result = await createDeadline(formData);
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
      <input
        name="description"
        placeholder="Descrição do prazo"
        required
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="date"
          name="dueDate"
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select name="priority" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="Alta">Alta</option>
          <option value="Média">Média</option>
          <option value="Baixa">Baixa</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="publishToPortal" defaultChecked />
        Publicar no portal (informativo)
      </label>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Criando..." : "Criar prazo"}
      </Button>
      {message && <span className="ml-3 text-sm text-slate-600">{message}</span>}
    </form>
  );
}
