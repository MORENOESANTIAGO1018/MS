"use client";

import { useRef, useState, useTransition } from "react";
import { assignStaffToClient } from "@/modules/admin/actions";
import { Button } from "@/components/ui/Button";

interface Props {
  staffProfiles: { id: string; full_name: string }[];
  clients: { id: string; full_name: string }[];
}

export function AssignStaffForm({ staffProfiles, clients }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await assignStaffToClient(formData);
      setMessage(result.message);
      if (result.success) formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <select name="profileId" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option value="">Membro da equipe</option>
        {staffProfiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name}
          </option>
        ))}
      </select>
      <select name="clientId" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option value="">Cliente</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Atribuindo..." : "Atribuir"}
      </Button>
      {message && <span className="text-sm text-slate-600">{message}</span>}
    </form>
  );
}
