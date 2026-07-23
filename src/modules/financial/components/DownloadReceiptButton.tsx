"use client";

import { useState } from "react";

export function DownloadReceiptButton({ financialEntryId }: { financialEntryId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/financial-entries/${financialEntryId}/receipt-url`);
      if (!response.ok) throw new Error("Falha ao gerar link");
      const { url } = (await response.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Não foi possível baixar o comprovante.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={isLoading}
        className="text-xs text-brand-navy underline underline-offset-2 disabled:opacity-50"
      >
        {isLoading ? "Gerando link..." : "Baixar comprovante"}
      </button>
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}
