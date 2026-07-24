import Link from "next/link";
import { getPublicEnv } from "@/lib/env";

// Renderização dinâmica: necessária para que o nonce de CSP por requisição
// (middleware.ts) chegue aos scripts inline de bootstrap do App Router —
// ver comentário em app/(institucional)/privacidade/page.tsx.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const env = getPublicEnv();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-navy px-6 text-center text-white">
      <p className="text-sm uppercase tracking-widest text-brand-gold-light">
        {env.NEXT_PUBLIC_OFFICE_NAME}
      </p>
      <h1 className="mt-4 text-3xl font-serif font-semibold sm:text-4xl">
        Portal do Cliente
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-200">
        Acompanhe seus processos, audiências, documentos e situação financeira em um
        único lugar, com segurança e sigilo profissional.
      </p>
      <Link
        href="/entrar"
        className="mt-8 rounded-xl bg-brand-gold px-6 py-3 text-sm font-medium text-brand-navy transition hover:bg-brand-gold-light"
      >
        Acessar o portal
      </Link>
      <footer className="mt-16 text-xs text-slate-400">
        <p>{env.NEXT_PUBLIC_OFFICE_ADDRESS || "Endereço do escritório"}</p>
        <p>
          {env.NEXT_PUBLIC_OFFICE_PHONE || "(00) 0000-0000"} ·{" "}
          {env.NEXT_PUBLIC_OFFICE_EMAIL || "contato@escritorio.com"}
        </p>
        <p className="mt-2 space-x-3">
          <Link href="/privacidade" className="underline">
            Política de Privacidade
          </Link>
          <Link href="/termos" className="underline">
            Termos de Uso
          </Link>
        </p>
      </footer>
    </main>
  );
}
