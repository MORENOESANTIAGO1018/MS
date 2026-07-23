"use client";

import { useTransition } from "react";
import { toggleDocumentVisibility } from "@/modules/admin/actions";

export function DocumentReviewForm({
  documentId,
  isVisibleToClient,
  reviewed,
}: {
  documentId: string;
  isVisibleToClient: boolean;
  reviewed: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function toggle(field: "isVisibleToClient" | "reviewed", current: boolean) {
    const nextValue = !current;
    const nextIsVisibleToClient = field === "isVisibleToClient" ? nextValue : isVisibleToClient;
    const nextReviewed = field === "reviewed" ? nextValue : reviewed;

    const formData = new FormData();
    formData.set("documentId", documentId);
    formData.set("isVisibleToClient", nextIsVisibleToClient ? "on" : "");
    formData.set("reviewed", nextReviewed ? "on" : "");
    startTransition(async () => {
      await toggleDocumentVisibility(formData);
    });
  }

  return (
    <div className="flex gap-3 text-xs">
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={reviewed}
          disabled={isPending}
          onChange={() => toggle("reviewed", reviewed)}
        />
        Revisado
      </label>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={isVisibleToClient}
          disabled={isPending}
          onChange={() => toggle("isVisibleToClient", isVisibleToClient)}
        />
        Visível no portal
      </label>
    </div>
  );
}
