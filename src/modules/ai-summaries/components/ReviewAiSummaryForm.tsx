"use client";

import { useRef, useState, useTransition } from "react";
import { approveAiSummary, rejectAiSummary } from "@/modules/ai-summaries/actions.server";
import { Button } from "@/components/ui/Button";

interface Props {
  summaryId: string;
  suggestedPlainLanguageSummary: string;
  suggestedClassification: string | null;
  suggestedPossibleDeadline: string | null;
}

export function ReviewAiSummaryForm({
  summaryId,
  suggestedPlainLanguageSummary,
  suggestedClassification,
  suggestedPossibleDeadline,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleApprove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await approveAiSummary(formData);
      setMessage(result.message);
    });
  }

  function handleReject() {
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("summaryId", summaryId);
      const result = await rejectAiSummary(formData);
      setMessage(result.message);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleApprove} className="space-y-3">
      <input type="hidden" name="summaryId" value={summaryId} />
      <textarea
        name="plainLanguageSummary"
        defaultValue={suggestedPlainLanguageSummary}
        required
        rows={4}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="text"
          name="classification"
          defaultValue={suggestedClassification ?? ""}
          placeholder="Classificação"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          name="possibleDeadline"
          defaultValue={suggestedPossibleDeadline ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="publishToPortal" />
        Publicar no portal do cliente
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Aprovar"}
        </Button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleReject}
          className="text-xs text-status-danger underline disabled:opacity-50"
        >
          Rejeitar sugestão
        </button>
      </div>
      {message && <span className="text-sm text-slate-600">{message}</span>}
    </form>
  );
}
