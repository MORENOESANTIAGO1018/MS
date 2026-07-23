"use client";

import { useRef, useState, useTransition } from "react";
import { createSupportRequest } from "@/modules/support/actions";
import { Button } from "@/components/ui/Button";

export function SupportRequestForm({ clientId }: { clientId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);

    startTransition(async () => {
      const result = await createSupportRequest(formData);
      setMessage(result.message);
      if (result.success) {
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="clientId" value={clientId} />
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-slate-700">
          Assunto
        </label>
        <input
          id="subject"
          name="subject"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="body" className="block text-sm font-medium text-slate-700">
          Descreva sua solicitação
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        />
      </div>

      {message && <p className="text-sm text-slate-700">{message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar solicitação"}
      </Button>
    </form>
  );
}
