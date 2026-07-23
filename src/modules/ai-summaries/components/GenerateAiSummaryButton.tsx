"use client";

import { useState, useTransition } from "react";
import { generateAiSummary } from "@/modules/ai-summaries/actions.server";

export function GenerateAiSummaryButton({ processUpdateId }: { processUpdateId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await generateAiSummary(processUpdateId);
            setMessage(result.message);
          })
        }
        className="text-xs font-medium text-brand-navy underline disabled:opacity-50"
      >
        {isPending ? "Gerando..." : "Gerar resumo com IA"}
      </button>
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </div>
  );
}
