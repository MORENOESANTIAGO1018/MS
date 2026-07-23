"use client";

import { useRef, useState, useTransition } from "react";
import { attachReceiptToFinancialEntry } from "@/modules/financial/actions.server";

interface Props {
  financialEntryId: string;
  clientId: string;
}

export function ReceiptUploadForm({ financialEntryId, clientId }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await attachReceiptToFinancialEntry(formData);
      setMessage(result.message);
      if (result.success) formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex items-center gap-2">
      <input type="hidden" name="financialEntryId" value={financialEntryId} />
      <input type="hidden" name="clientId" value={clientId} />
      <input
        type="file"
        name="file"
        required
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        className="text-xs"
      />
      <button
        type="submit"
        disabled={isPending}
        className="text-xs font-medium text-brand-navy underline disabled:opacity-50"
      >
        {isPending ? "Enviando..." : "Anexar comprovante"}
      </button>
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </form>
  );
}
