"use client";

import { useTransition } from "react";
import { logout } from "@/modules/auth/actions.server";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => logout())}
      disabled={isPending}
      className="text-sm text-slate-500 hover:text-brand-navy hover:underline"
    >
      {isPending ? "Saindo..." : "Sair"}
    </button>
  );
}
