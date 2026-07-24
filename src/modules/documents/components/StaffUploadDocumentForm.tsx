"use client";

import { useRef, useState, useTransition } from "react";
import { uploadDocumentAsStaff } from "@/modules/documents/actions.server";
import { DOCUMENT_CATEGORIES } from "@/modules/documents/schema";
import { Button } from "@/components/ui/Button";

interface Props {
  clients: { id: string; full_name: string }[];
}

export function StaffUploadDocumentForm({ clients }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await uploadDocumentAsStaff(formData);
      setMessage(result.message);
      if (result.success) formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <select
        name="clientId"
        required
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Selecione o cliente</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.full_name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          className="text-sm"
        />
        <select name="category" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Categoria (opcional)</option>
          {DOCUMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isConfidential" />
          Sigiloso (nunca visível ao cliente)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="publishToPortal" />
          Publicar no portal imediatamente
        </label>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar documento"}
      </Button>
      {message && <span className="ml-3 text-sm text-slate-600">{message}</span>}
    </form>
  );
}
