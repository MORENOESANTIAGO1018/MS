"use client";

import { useRef, useState, useTransition } from "react";
import { sendMessage } from "@/modules/messages/actions.server";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";

interface MessageItem {
  id: string;
  body: string;
  sender_role: "client" | "staff";
  created_at: string;
}

export function MessageThread({
  clientId,
  messages,
}: {
  clientId: string;
  messages: MessageItem[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await sendMessage(formData);
      if (result.success) {
        formRef.current?.reset();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-surface p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma mensagem ainda.</p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.sender_role === "client"
                ? "ml-auto max-w-[80%] rounded-lg bg-brand-navy px-3 py-2 text-sm text-white"
                : "mr-auto max-w-[80%] rounded-lg bg-surface-muted px-3 py-2 text-sm text-slate-800"
            }
          >
            <p>{message.body}</p>
            <p className="mt-1 text-[10px] opacity-70">{formatDateTime(message.created_at)}</p>
          </div>
        ))}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2">
        <input type="hidden" name="clientId" value={clientId} />
        <textarea
          name="body"
          required
          rows={2}
          placeholder="Escreva sua mensagem..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enviando..." : "Enviar"}
        </Button>
      </form>
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}
