"use client";

import { useEffect, useRef, useState } from "react";

type Offset = { x: number; y: number };

export function ImageCropEditor({
  src,
  aspect,
  outputWidth = 1200,
  quality = 0.92,
  onCancel,
  onSave,
}: {
  src: string;
  aspect: number; // width / height
  outputWidth?: number;
  quality?: number;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [frameSize, setFrameSize] = useState({ w: 420, h: 420 / aspect });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; startOffset: Offset } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function updateFrame() {
      const w = Math.min(420, window.innerWidth - 64);
      setFrameSize({ w, h: w / aspect });
    }
    updateFrame();
    window.addEventListener("resize", updateFrame);
    return () => window.removeEventListener("resize", updateFrame);
  }, [aspect]);

  function baseScale(natural = naturalSize, frame = frameSize) {
    if (!natural) return 1;
    return Math.max(frame.w / natural.w, frame.h / natural.h);
  }

  function clampOffset(next: Offset, scale: number, natural = naturalSize, frame = frameSize): Offset {
    if (!natural) return next;
    const dW = natural.w * scale;
    const dH = natural.h * scale;
    const minX = frame.w - dW;
    const minY = frame.h - dH;
    return {
      x: Math.min(0, Math.max(minX, next.x)),
      y: Math.min(0, Math.max(minY, next.y)),
    };
  }

  function handleImgLoad() {
    const el = imgRef.current;
    if (!el) return;
    const natural = { w: el.naturalWidth, h: el.naturalHeight };
    setNaturalSize(natural);
    const scale = baseScale(natural, frameSize);
    setOffset({
      x: (frameSize.w - natural.w * scale) / 2,
      y: (frameSize.h - natural.h * scale) / 2,
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const scale = baseScale() * zoom;
    setOffset(
      clampOffset(
        { x: dragState.current.startOffset.x + dx, y: dragState.current.startOffset.y + dy },
        scale
      )
    );
  }
  function onPointerUp() {
    dragState.current = null;
  }

  function handleZoomChange(next: number) {
    setZoom(next);
    setOffset((o) => clampOffset(o, baseScale() * next));
  }

  async function handleSave() {
    if (!naturalSize || !imgRef.current) return;
    setSaving(true);
    const scale = baseScale() * zoom;
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sw = frameSize.w / scale;
    const sh = frameSize.h / scale;
    const outputW = outputWidth;
    const outputH = Math.round(outputW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setSaving(false);
      return;
    }
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outputW, outputH);
    canvas.toBlob(
      (blob) => {
        setSaving(false);
        if (blob) onSave(blob);
      },
      "image/jpeg",
      quality
    );
  }

  const scale = baseScale() * zoom;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onCancel}
    >
      <div
        className="flex flex-col gap-4 rounded-[var(--radius)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium">Drag to reposition, use the slider to zoom</p>
        <div
          style={{ width: frameSize.w, height: frameSize.h }}
          className="relative touch-none select-none overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-muted)]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            crossOrigin="anonymous"
            draggable={false}
            onLoad={handleImgLoad}
            style={
              naturalSize
                ? {
                    position: "absolute",
                    left: offset.x,
                    top: offset.y,
                    width: naturalSize.w * scale,
                    height: naturalSize.h * scale,
                    maxWidth: "none",
                  }
                : { opacity: 0 }
            }
          />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => handleZoomChange(Number(e.target.value))}
          className="accent-[var(--accent)]"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !naturalSize}
            className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
