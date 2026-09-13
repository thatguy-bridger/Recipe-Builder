"use client";

import { useEffect, useState } from "react";

// Prefills the Import page's textarea from a `#data=<base64 JSON>` URL
// fragment — how the browser extension's bookmarklet hands off a recipe
// it just scraped, without ever sending the data to a server (fragments
// never leave the browser). Clears the fragment after reading it so a
// refresh or share of the URL doesn't replay stale data.
export function ImportPrefill() {
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#data=")) return;

    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[name="json"]');
    try {
      const encoded = hash.slice("#data=".length);
      const json = decodeURIComponent(escape(atob(encoded)));
      // Validate + pretty-print rather than dumping the raw base64 payload.
      const parsed = JSON.parse(json);
      if (textarea) {
        textarea.value = JSON.stringify(parsed, null, 2);
        // The textarea is a React-controlled input (for the live preview) —
        // setting .value directly doesn't notify React, so fire the native
        // event its onChange listens for.
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
      setPrefilled(true);
    } catch {
      // Malformed/tampered fragment — leave the textarea empty rather than
      // inserting something broken.
    } finally {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  if (!prefilled) return null;
  return (
    <p className="mb-4 rounded-lg bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
      Recipe filled in from the bookmarklet — review it below, then click Import.
    </p>
  );
}
