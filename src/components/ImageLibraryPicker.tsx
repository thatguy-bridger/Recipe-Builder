"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ImageLibraryPicker({
  onSelect,
  onClose,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<{ name: string; url: string }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from("recipe-photos").list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (cancelled) return;
      if (error || !data) {
        setItems([]);
        return;
      }
      const files = data.filter((d) => d.id && d.name !== "brand");
      setItems(
        files.map((f) => ({
          name: f.name,
          url: supabase.storage.from("recipe-photos").getPublicUrl(f.name).data.publicUrl,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[var(--radius)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">Choose from your photos</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto">
          {items === null ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-[var(--bg-muted)]" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No previously uploaded photos yet — upload one first.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {items.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => onSelect(item.url)}
                  className="aspect-square overflow-hidden rounded-lg border border-[var(--border)] hover:border-[var(--accent)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
