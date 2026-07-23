"use client";

import { useState, useTransition } from "react";
import { blockUser, revokeSessions } from "@/modules/auth/actions.server";
import { Button } from "@/components/ui/Button";

export function UserActions({ profileId, isActive }: { profileId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [showBlockForm, setShowBlockForm] = useState(false);

  function handleBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("profileId", profileId);
    startTransition(async () => {
      const result = await blockUser(formData);
      setMessage(result.message);
      setShowBlockForm(false);
    });
  }

  function handleRevoke() {
    const formData = new FormData();
    formData.set("profileId", profileId);
    startTransition(async () => {
      const result = await revokeSessions(formData);
      setMessage(result.message);
    });
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="flex gap-2">
        {isActive ? (
          <button
            onClick={() => setShowBlockForm((v) => !v)}
            className="text-status-danger underline"
          >
            Bloquear acesso
          </button>
        ) : (
          <span className="text-status-danger">Bloqueado</span>
        )}
        <button onClick={handleRevoke} disabled={isPending} className="text-brand-navy underline">
          Revogar sessões
        </button>
      </div>
      {showBlockForm && (
        <form onSubmit={handleBlock} className="flex gap-2">
          <input
            name="reason"
            placeholder="Motivo do bloqueio"
            required
            className="rounded border border-slate-300 px-2 py-1 text-xs"
          />
          <Button type="submit" variant="danger" disabled={isPending} className="text-xs">
            Confirmar
          </Button>
        </form>
      )}
      {message && <p className="text-slate-500">{message}</p>}
    </div>
  );
}
