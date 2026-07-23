import { getPortalContext } from "@/modules/clients/current-client";
import { PortalNav } from "@/components/portal/PortalNav";
import { LogoutButton } from "@/modules/auth/components/LogoutButton";
import { getPublicEnv } from "@/lib/env";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { client } = await getPortalContext();
  const env = getPublicEnv();

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-slate-200 bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-brand-gold">
              {env.NEXT_PUBLIC_OFFICE_NAME}
            </p>
            <p className="text-sm font-medium text-slate-900">{client.full_name}</p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="w-56 shrink-0">
          <PortalNav />
        </aside>
        <main className="flex-1 space-y-6">{children}</main>
      </div>
    </div>
  );
}
