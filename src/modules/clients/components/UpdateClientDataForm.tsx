"use client";

import { useState, useTransition } from "react";
import { updateOwnClientData } from "@/modules/clients/actions";
import { Button } from "@/components/ui/Button";

interface Props {
  clientId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
}

export function UpdateClientDataForm({ clientId, fullName, email, phone, whatsapp }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);

    startTransition(async () => {
      const result = await updateOwnClientData(formData);
      setMessage(result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="clientId" value={clientId} />
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
          Nome completo
        </label>
        <input
          id="fullName"
          name="fullName"
          defaultValue={fullName}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={email ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
          Telefone
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={phone ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-700">
          WhatsApp
        </label>
        <input
          id="whatsapp"
          name="whatsapp"
          defaultValue={whatsapp ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        />
      </div>

      {message && <p className="text-sm text-slate-700">{message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
