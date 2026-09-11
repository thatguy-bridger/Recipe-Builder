"use client";

import { useEffect, useRef } from "react";

// React 19 sanitizes `javascript:` URLs passed through JSX's `href` prop
// (a built-in XSS guard) — it silently drops them, which made this link
// just navigate to nothing instead of running the bookmarklet. Setting
// the attribute directly on the DOM node via a ref bypasses that
// sanitization; it only applies to values React itself writes.
export function BookmarkletLink({ href, children }: { href: string; children: React.ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    ref.current?.setAttribute("href", href);
  }, [href]);

  return (
    <a
      ref={ref}
      onClick={(e) => e.preventDefault()}
      className="inline-block cursor-grab select-none rounded-full bg-[var(--accent)] px-5 py-2.5 font-medium text-white shadow-[var(--shadow)] hover:bg-[var(--accent-hover)]"
      draggable
    >
      {children}
    </a>
  );
}
