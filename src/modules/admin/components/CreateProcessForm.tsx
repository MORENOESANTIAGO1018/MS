"use client";

import { useRef, useState, useTransition } from "react";
import { createProcess } from "@/modules/admin/actions";
import { Button } from "@/components/ui/Button";

interface Props {
  clients: { id: string; full_name: string }[];
}

export function CreateProcessForm({ clients }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await createProcess(formData);
      setMessage(result.message);
      if (result.success) formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <select name="clientId" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option value="">Selecione o cliente</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name}
          </option>
        ))}
      </select>
      <input
        name="processNumber"
        placeholder="Número do processo"
        required
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="court"
        placeholder="Tribunal"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="practiceArea"
        placeholder="Área jurídica"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <textarea
        name="clientSummary"
        placeholder="Resumo para o cliente (opcional)"
        className="sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Criar processo"}
        </Button>
        {message && <span className="ml-3 text-sm text-slate-600">{message}</span>}
      </div>
    </form>
  );
}
