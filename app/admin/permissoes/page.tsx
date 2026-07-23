import type { Metadata } from "next";
import { listAllClientAccess, listAllClients, listAllUsers } from "@/modules/admin/queries";
import { AssignStaffForm } from "@/modules/admin/components/AssignStaffForm";
import { RevokeAssignmentButton } from "@/modules/admin/components/RevokeAssignmentButton";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Permissões" };

export default async function AdminPermissoesPage() {
  const [access, clients, users] = await Promise.all([
    listAllClientAccess(),
    listAllClients(),
    listAllUsers(),
  ]);
  const clientNameById = new Map(clients.map((c) => [c.id, c.full_name]));
  const profileNameById = new Map(users.map((u) => [u.id, u.full_name]));
  const staffProfiles = users.filter((u) => u.role === "staff" || u.role === "admin");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Permissões</h1>

      <Card>
        <CardTitle>Atribuir membro da equipe a um cliente</CardTitle>
        <div className="mt-3">
          <AssignStaffForm
            staffProfiles={staffProfiles.map((u) => ({ id: u.id, full_name: u.full_name }))}
            clients={clients.map((c) => ({ id: c.id, full_name: c.full_name }))}
          />
        </div>
      </Card>

      <div className="space-y-2">
        {access.map((row) => (
          <Card key={row.id}>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium text-slate-900">
                  {profileNameById.get(row.profile_id) ?? row.profile_id}
                </span>{" "}
                → {clientNameById.get(row.client_id) ?? row.client_id}
                <Badge tone="neutral" className="ml-2">
                  {row.access_level}
                </Badge>
                {!row.is_active && (
                  <Badge tone="danger" className="ml-1">
                    Revogado
                  </Badge>
                )}
              </div>
              {row.is_active && <RevokeAssignmentButton clientAccessId={row.id} />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
