import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-muted px-6 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Página não encontrada</h1>
      <p className="max-w-md text-sm text-slate-600">
        O endereço acessado não existe ou você não tem permissão para vê-lo.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-brand-navy px-5 py-2 text-sm font-medium text-white hover:bg-brand-navy-light"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
