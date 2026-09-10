"use client";

import { SCALE_MAX, SCALE_MIN, SCALE_STEP, useTheme } from "./ThemeProvider";

export function ContentScaler() {
  const { scale, setScale } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-1 py-1 text-xs">
      <button
        type="button"
        onClick={() => setScale(scale - SCALE_STEP)}
        disabled={scale <= SCALE_MIN}
        aria-label="Shrink content"
        className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30"
      >
        &minus;
      </button>
      <button
        type="button"
        onClick={() => setScale(100)}
        aria-label="Reset content size"
        className="min-w-[2.5rem] px-1 text-center text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        {scale}%
      </button>
      <button
        type="button"
        onClick={() => setScale(scale + SCALE_STEP)}
        disabled={scale >= SCALE_MAX}
        aria-label="Enlarge content"
        className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
