"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageCropEditor } from "./ImageCropEditor";

export function EditableImage({
  src,
  alt = "",
  aspect,
  outputWidth = 1200,
  className,
  onChange,
}: {
  src: string;
  alt?: string;
  aspect: number;
  outputWidth?: number;
  className?: string;
  onChange: (newUrl: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(blob: Blob) {
    setSaving(true);
    const supabase = createClient();
    const path = `${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from("recipe-photos")
      .upload(path, blob, { contentType: "image/jpeg" });
    setSaving(false);
    setEditing(false);
    if (error) {
      alert(`Couldn't save the crop: ${error.message}`);
      return;
    }
    const { data } = supabase.storage.from("recipe-photos").getPublicUrl(path);
    onChange(data.publicUrl);
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full rounded-lg object-cover" />
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Edit photo"
        disabled={saving}
        className="absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80 disabled:opacity-50"
      >
        {saving ? "…" : "✎"}
      </button>
      {editing && (
        <ImageCropEditor
          src={src}
          aspect={aspect}
          outputWidth={outputWidth}
          onCancel={() => setEditing(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
