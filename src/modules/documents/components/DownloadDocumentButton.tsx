"use client";

import { useState } from "react";

export function DownloadDocumentButton({ documentId }: { documentId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/signed-url`);
      if (!response.ok) {
        throw new Error("Falha ao gerar link");
      }
      const { url } = (await response.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Não foi possível baixar o documento.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={isLoading}
        className="text-sm text-brand-navy underline underline-offset-2 disabled:opacity-50"
      >
        {isLoading ? "Gerando link..." : "Baixar"}
      </button>
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}
