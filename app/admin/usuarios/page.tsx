import type { Metadata } from "next";
import { listAllUsers } from "@/modules/admin/queries";
import { UserActions } from "@/modules/admin/components/UserActions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Usuários" };

const ROLE_LABEL: Record<string, string> = {
  client: "Cliente",
  staff: "Equipe",
  admin: "Administrador",
};

export default async function AdminUsuariosPage() {
  const users = await listAllUsers();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Usuários</h1>

      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">{user.full_name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
                <p className="text-xs text-slate-400">
                  Último acesso: {formatDate(user.last_login_at)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge tone={user.is_active ? "success" : "danger"}>
                  {ROLE_LABEL[user.role]} · {user.is_active ? "Ativo" : "Bloqueado"}
                </Badge>
                <UserActions profileId={user.id} isActive={user.is_active} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
