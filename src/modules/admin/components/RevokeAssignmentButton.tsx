"use client";

import { useTransition } from "react";
import { revokeStaffAssignment } from "@/modules/admin/actions";

export function RevokeAssignmentButton({ clientAccessId }: { clientAccessId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await revokeStaffAssignment(clientAccessId);
        })
      }
      className="text-xs text-status-danger underline"
    >
      {isPending ? "Revogando..." : "Revogar"}
    </button>
  );
}
