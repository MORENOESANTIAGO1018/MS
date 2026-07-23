"use client";

import { useRef, useState, useTransition } from "react";
import { uploadDocument } from "@/modules/documents/actions.server";
import { Button } from "@/components/ui/Button";

export function DocumentUploadForm({ clientId }: { clientId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);

    startTransition(async () => {
      const result = await uploadDocument(formData);
      setMessage(result.message);
      if (result.success) {
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="flex-1">
        <label htmlFor="file" className="block text-xs font-medium text-slate-600">
          Arquivo (PDF, imagem ou Word — até alguns MB)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          className="mt-1 block w-full text-sm"
        />
      </div>
      <Button type="submit" disabled={isPending} variant="secondary">
        {isPending ? "Enviando..." : "Enviar"}
      </Button>
      {message && <p className="text-xs text-slate-600 sm:ml-2">{message}</p>}
    </form>
  );
}
