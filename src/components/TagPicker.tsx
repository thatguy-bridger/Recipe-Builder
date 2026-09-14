"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function titleCase(text: string): string {
  return text.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

// A custom multi-column tag dropdown: click the trigger to browse every tag
// already used elsewhere (in a scrolling grid, not a single-column list),
// toggle any of them, or type to filter/add a brand-new one. Submits as a
// single hidden comma-separated input so the server action (which expects
// `formData.get("tags")` as one string) doesn't need to change at all.
export function TagPicker({
  name,
  initialTags = [],
  suggestions = [],
}: {
  name: string;
  initialTags?: string[];
  suggestions?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialTags);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const allOptions = useMemo(() => {
    const set = new Set([...suggestions, ...selected]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [suggestions, selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? allOptions.filter((t) => t.toLowerCase().includes(q)) : allOptions;
  }, [allOptions, query]);

  const trimmedQuery = query.trim();
  const queryMatchesExisting = allOptions.some((t) => t.toLowerCase() === trimmedQuery.toLowerCase());

  function toggle(tag: string) {
    setSelected((s) => (s.includes(tag) ? s.filter((t) => t !== tag) : [...s, tag]));
  }

  function addCustom() {
    if (!trimmedQuery) return;
    const tag = titleCase(trimmedQuery);
    setSelected((s) => (s.includes(tag) ? s : [...s, tag]));
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1 text-sm">
      <span>Tags</span>
      <input type="hidden" name={name} value={selected.join(", ")} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-[2.75rem] flex-wrap items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-left outline-none focus:border-[var(--accent)]"
      >
        {selected.length === 0 ? (
          <span className="text-[var(--text-muted)]">Add tags…</span>
        ) : (
          selected.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]"
            >
              {tag}
              <span
                role="button"
                aria-label={`Remove ${tag}`}
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(tag);
                }}
                className="hover:text-[var(--danger)]"
              >
                ✕
              </span>
            </span>
          ))
        )}
      </button>

      {open && (
        <div className="absolute top-full z-30 mt-1 w-full min-w-[280px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow)]">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Search or add a tag…"
            className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          {filtered.length > 0 && (
            <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
              {filtered.map((tag) => {
                const isSelected = selected.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle(tag)}
                    aria-pressed={isSelected}
                    className={`truncate rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                      isSelected ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--bg-muted)]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
          {filtered.length === 0 && (
            <p className="px-1 py-1.5 text-xs text-[var(--text-muted)]">No matching tags.</p>
          )}
          {trimmedQuery && !queryMatchesExisting && (
            <button
              type="button"
              onClick={addCustom}
              className="mt-2 w-full rounded-lg border border-dashed border-[var(--border)] px-2 py-1.5 text-left text-xs text-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              + Add &ldquo;{titleCase(trimmedQuery)}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
