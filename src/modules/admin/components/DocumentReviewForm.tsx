"use client";

import { useTransition } from "react";
import { toggleDocumentVisibility } from "@/modules/admin/actions";

export function DocumentReviewForm({
  documentId,
  isVisibleToClient,
  reviewed,
  isConfidential,
}: {
  documentId: string;
  isVisibleToClient: boolean;
  reviewed: boolean;
  isConfidential: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function toggle(field: "isVisibleToClient" | "reviewed" | "isConfidential", current: boolean) {
    const nextValue = !current;
    const nextIsVisibleToClient =
      field === "isVisibleToClient"
        ? nextValue
        : field === "isConfidential" && nextValue
          ? false
          : isVisibleToClient;
    const nextReviewed = field === "reviewed" ? nextValue : reviewed;
    const nextIsConfidential = field === "isConfidential" ? nextValue : isConfidential;

    const formData = new FormData();
    formData.set("documentId", documentId);
    formData.set("isVisibleToClient", nextIsVisibleToClient ? "on" : "");
    formData.set("reviewed", nextReviewed ? "on" : "");
    formData.set("isConfidential", nextIsConfidential ? "on" : "");
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
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={isConfidential}
          disabled={isPending}
          onChange={() => toggle("isConfidential", isConfidential)}
        />
        Sigiloso
      </label>
    </div>
  );
}
