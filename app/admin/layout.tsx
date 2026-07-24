import { requireStaffProfile } from "@/modules/admin/require-staff";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoutButton } from "@/modules/auth/components/LogoutButton";
import { getPublicEnv } from "@/lib/env";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaffProfile();
  const env = getPublicEnv();

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-slate-200 bg-brand-navy text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-brand-gold-light">
              {env.NEXT_PUBLIC_OFFICE_NAME} · Painel administrativo
            </p>
            <p className="text-sm font-medium">
              {profile.full_name} · {profile.role === "admin" ? "Administrador" : "Equipe"}
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1 space-y-6">{children}</main>
      </div>
    </div>
  );
}
