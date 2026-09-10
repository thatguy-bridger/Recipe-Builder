"use client";

import { useState } from "react";

// Wraps the nav's collapsible content (content scaler, links, theme toggle,
// auth button). Above the `sm` breakpoint it's always shown inline; below
// it, only the logo and this hamburger button remain in the top bar, and
// the content drops into a full-width panel underneath when toggled open.
export function MobileNavMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text)] hover:bg-[var(--bg-muted)] sm:hidden"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
            <path d="M0 1H18M0 7H18M0 13H18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <div
        className={`${
          open ? "flex" : "hidden"
        } basis-full flex-col gap-3 border-t border-[var(--border)] pt-3 sm:flex sm:basis-auto sm:flex-row sm:items-center sm:gap-4 sm:border-0 sm:pt-0`}
      >
        {children}
      </div>
    </>
  );
}
