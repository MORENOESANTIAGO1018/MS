"use client";

import { useState, useTransition } from "react";
import { createInvite } from "@/modules/auth/actions.server";
import { Button } from "@/components/ui/Button";

export function CreateInviteForm({ clientId }: { clientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("clientId", clientId);
    setMessage(null);
    startTransition(async () => {
      const result = await createInvite(formData);
      setMessage(result.message);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-brand-navy underline underline-offset-2"
      >
        Criar convite de acesso
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
      <input
        name="fullName"
        placeholder="Nome do contato"
        required
        className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
      />
      <input
        name="email"
        type="email"
        placeholder="E-mail de acesso"
        required
        className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
      />
      <Button type="submit" disabled={isPending} className="w-fit text-xs">
        {isPending ? "Enviando..." : "Gerar convite"}
      </Button>
      {message && <p className="text-xs text-slate-700">{message}</p>}
    </form>
  );
}
