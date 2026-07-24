"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Usa <dialog> nativo: foco preso, fechamento por Esc e clique no backdrop
 * ja vem de graca do navegador, sem precisar reimplementar nada disso.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="modal-title"
      className="rounded-xl border border-slate-200 p-0 shadow-lg backdrop:bg-slate-900/40"
    >
      <div className="w-full max-w-md p-5">
        <h2 id="modal-title" className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </dialog>
  );
}
