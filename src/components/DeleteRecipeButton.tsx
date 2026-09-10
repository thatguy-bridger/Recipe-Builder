"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export function DeleteRecipeButton({ action }: { action: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-[var(--danger)] hover:underline"
      >
        Delete recipe
      </button>
      <form ref={formRef} action={action} className="hidden" />
      <ConfirmDialog
        open={open}
        title="Delete this recipe?"
        message="This permanently removes the recipe, its ingredients, steps, and photos. This can't be undone."
        confirmLabel="Delete"
        danger
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
