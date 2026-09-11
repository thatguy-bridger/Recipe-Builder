"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageCropEditor, type CropShape } from "./ImageCropEditor";
import { ImageLibraryPicker } from "./ImageLibraryPicker";

// Every photo that enters the app goes through this: pick a file (or several)
// or choose one already uploaded, crop/reposition it, then it's saved. No
// raw, uncropped uploads.
export function PhotoPicker({
  initialShape,
  outputWidth = 1200,
  multiple = false,
  onAdd,
  children,
  className,
}: {
  initialShape?: CropShape;
  outputWidth?: number;
  multiple?: boolean;
  onAdd: (url: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [queue, setQueue] = useState<File[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setQueue(list.slice(1));
    setCropSrc(URL.createObjectURL(list[0]));
  }

  function advanceQueue() {
    setQueue((q) => {
      if (q.length === 0) {
        setCropSrc(null);
        return q;
      }
      const [next, ...rest] = q;
      setCropSrc(URL.createObjectURL(next));
      return rest;
    });
  }

  async function handleCropSave(blob: Blob) {
    setSaving(true);
    const supabase = createClient();
    const path = `${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from("recipe-photos")
      .upload(path, blob, { contentType: "image/jpeg" });
    setSaving(false);
    if (error) {
      alert(`Upload failed: ${error.message}`);
    } else {
      const { data } = supabase.storage.from("recipe-photos").getPublicUrl(path);
      onAdd(data.publicUrl);
    }
    advanceQueue();
  }

  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <div onClick={() => setMenuOpen((v) => !v)} className="cursor-pointer">
        {children}
      </div>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                inputRef.current?.click();
              }}
              className="whitespace-nowrap px-3 py-2 text-left text-xs hover:bg-[var(--bg-muted)]"
            >
              Upload {multiple ? "photo(s)" : "photo"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setLibraryOpen(true);
              }}
              className="whitespace-nowrap px-3 py-2 text-left text-xs hover:bg-[var(--bg-muted)]"
            >
              Choose from library
            </button>
          </div>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {cropSrc && (
        <ImageCropEditor
          src={cropSrc}
          initialShape={initialShape}
          outputWidth={outputWidth}
          onCancel={advanceQueue}
          onSave={handleCropSave}
        />
      )}
      {libraryOpen && (
        <ImageLibraryPicker
          onSelect={(url) => {
            onAdd(url);
            setLibraryOpen(false);
          }}
          onClose={() => setLibraryOpen(false)}
        />
      )}
      {saving && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
          <div className="rounded-lg bg-[var(--bg-elevated)] px-4 py-2 text-sm shadow-[var(--shadow)]">
            Saving…
          </div>
        </div>
      )}
    </div>
  );
}
