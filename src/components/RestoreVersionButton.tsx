"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export function RestoreVersionButton({
  action,
  label,
}: {
  action: () => Promise<void>;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--accent)] hover:underline"
      >
        Restore
      </button>
      <form ref={formRef} action={action} className="hidden" />
      <ConfirmDialog
        open={open}
        title="Restore this version?"
        message={`Your current title, ingredients, steps, and other fields will be replaced with the ${label} snapshot. Your current state is saved as a new version first, so this can be undone.`}
        confirmLabel="Restore"
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setBusy(true);
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
