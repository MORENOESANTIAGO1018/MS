import { getPublicEnv } from "@/lib/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const env = getPublicEnv();

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-surface p-8 shadow-sm">
        <p className="text-center text-xs uppercase tracking-widest text-brand-gold">
          {env.NEXT_PUBLIC_OFFICE_NAME}
        </p>
        <h1 className="mt-2 text-center text-xl font-serif font-semibold text-brand-navy">
          Portal do Cliente
        </h1>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
