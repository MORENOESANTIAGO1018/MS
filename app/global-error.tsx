"use client";

/**
 * Fallback de ultima instancia (erro no proprio root layout). Mantido
 * deliberadamente simples e sem dependencias externas.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            padding: "1.5rem",
          }}
        >
          <h1>Ocorreu um erro inesperado</h1>
          <p>Tente novamente em instantes.</p>
          <button onClick={reset}>Tentar novamente</button>
        </main>
      </body>
    </html>
  );
}
