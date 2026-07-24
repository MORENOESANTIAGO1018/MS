"use client";

import { useState, useTransition } from "react";
import { revokeStaffAssignment } from "@/modules/admin/actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function RevokeAssignmentButton({ clientAccessId }: { clientAccessId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function confirmRevoke() {
    setConfirmOpen(false);
    startTransition(async () => {
      await revokeStaffAssignment(clientAccessId);
    });
  }

  return (
    <>
      <button
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
        className="text-xs text-status-danger underline disabled:opacity-50"
      >
        {isPending ? "Revogando..." : "Revogar"}
      </button>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Revogar acesso da equipe?">
        <p className="text-sm text-slate-600">
          A pessoa deixará de ver os dados deste cliente imediatamente. Esta ação pode ser
          desfeita depois, atribuindo o acesso novamente.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmRevoke}>
            Revogar
          </Button>
        </div>
      </Modal>
    </>
  );
}
