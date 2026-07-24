import type { Metadata } from "next";
import { getPublicEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Manutenção programada" };
export const dynamic = "force-dynamic";

export default function ManutencaoPage() {
  const env = getPublicEnv();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-navy px-6 text-center text-white">
      <p className="text-sm uppercase tracking-widest text-brand-gold-light">
        {env.NEXT_PUBLIC_OFFICE_NAME}
      </p>
      <h1 className="text-2xl font-serif font-semibold">Manutenção programada</h1>
      <p className="max-w-md text-sm text-slate-200">
        O Portal do Cliente está passando por uma manutenção rápida e volta em
        instantes. Nenhum dado foi perdido.
      </p>
      {env.NEXT_PUBLIC_OFFICE_PHONE && (
        <p className="text-xs text-slate-300">
          Caso seja urgente, entre em contato: {env.NEXT_PUBLIC_OFFICE_PHONE}
        </p>
      )}
    </main>
  );
}
