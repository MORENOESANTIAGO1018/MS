"use client";

import { useRef, useState, useTransition } from "react";
import { createContract } from "@/modules/admin/actions";
import { Button } from "@/components/ui/Button";

interface Props {
  clients: { id: string; full_name: string }[];
}

export function CreateContractForm({ clients }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await createContract(formData);
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
        name="contractNumber"
        placeholder="Número do contrato"
        required
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="serviceType"
        placeholder="Tipo de serviço"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="totalValue"
        type="number"
        step="0.01"
        placeholder="Valor total"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
        <input type="checkbox" name="publishToPortal" />
        Publicar no portal
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Criar contrato"}
        </Button>
        {message && <span className="ml-3 text-sm text-slate-600">{message}</span>}
      </div>
    </form>
  );
}
