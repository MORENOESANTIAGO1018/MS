"use client";

import { useTransition } from "react";
import { updateFinancialStatus } from "@/modules/admin/actions";
import type { FinancialStatus } from "@/lib/supabase/database.types";

const OPTIONS: FinancialStatus[] = [
  "pendente",
  "a_vencer",
  "vencido",
  "pago",
  "renegociado",
  "cancelado",
];

export function UpdateFinancialStatusForm({
  entryId,
  status,
}: {
  entryId: string;
  status: FinancialStatus;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set("entryId", entryId);
    formData.set("status", event.target.value);
    startTransition(async () => {
      await updateFinancialStatus(formData);
    });
  }

  return (
    <select
      defaultValue={status}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
    >
      {OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
