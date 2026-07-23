"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/modules/admin/actions";
import { Button } from "@/components/ui/Button";

export function CreateClientForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await createClient(formData);
      setMessage(result.message);
      if (result.success) formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input
        name="fullName"
        placeholder="Nome completo"
        required
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="practiceArea"
        placeholder="Área jurídica"
        required
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        placeholder="E-mail"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="phone"
        placeholder="Telefone"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="whatsapp"
        placeholder="WhatsApp"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="internalCode"
        placeholder="Código interno"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Cadastrar cliente"}
        </Button>
        {message && <span className="ml-3 text-sm text-slate-600">{message}</span>}
      </div>
    </form>
  );
}
