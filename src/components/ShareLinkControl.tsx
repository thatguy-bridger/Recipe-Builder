"use client";

import { useState, useTransition } from "react";
import { createShareLink, revokeShareLink } from "@/app/actions/recipes";

export function ShareLinkControl({
  recipeId,
  initialToken,
}: {
  recipeId: string;
  initialToken: string | null;
}) {
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const url = token && typeof window !== "undefined" ? `${window.location.origin}/share/${token}` : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {token ? (
        <>
          <input
            readOnly
            value={url ?? `/share/${token}`}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={async () => {
              if (url) await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-muted)]"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await revokeShareLink(recipeId);
                setToken(null);
              })
            }
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--danger)] hover:bg-[var(--bg-muted)]"
          >
            Revoke
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const newToken = await createShareLink(recipeId);
              if (newToken) setToken(newToken);
            })
          }
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Create share link
        </button>
      )}
    </div>
  );
}
