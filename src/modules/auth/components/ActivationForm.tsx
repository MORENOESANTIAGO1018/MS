"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateAccount } from "@/modules/auth/actions.server";
import { Button } from "@/components/ui/Button";

export function ActivationForm({ clientAccessId }: { clientAccessId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("clientAccessId", clientAccessId);
    setMessage(null);

    startTransition(async () => {
      const result = await activateAccount(formData);
      setMessage(result.message);
      setSuccess(result.success);
      if (result.success) {
        setTimeout(() => router.push("/entrar"), 1500);
      }
    });
  }

  if (success) {
    return (
      <p className="rounded-lg bg-status-success/10 p-4 text-sm text-status-success">
        {message} Redirecionando para o login...
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-slate-700">
          Código de ativação
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          autoComplete="one-time-code"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase tracking-widest focus:border-brand-navy focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        />
      </div>
      <div>
        <label
          htmlFor="passwordConfirmation"
          className="block text-sm font-medium text-slate-700"
        >
          Confirme a nova senha
        </label>
        <input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        />
      </div>

      {message && (
        <p role="alert" className="text-sm text-status-danger">
          {message}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Ativando..." : "Ativar conta"}
      </Button>
    </form>
  );
}
