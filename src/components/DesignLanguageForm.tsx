"use client";

import { useRef, useState } from "react";
import {
  FONT_PRESETS,
  RADIUS_PRESETS,
  type FontPreset,
  type RadiusPreset,
  buildThemeStyle,
} from "@/lib/designLanguage";
import { EditableImage } from "./EditableImage";
import { PhotoPicker } from "./PhotoPicker";
import { SubmitButton } from "./SubmitButton";

const DEFAULT_ACCENT = "#c1622e";

export function DesignLanguageForm({
  action,
  initial,
}: {
  action: (formData: FormData) => void;
  initial: {
    theme_accent: string | null;
    theme_radius: string | null;
    theme_font: string | null;
    theme_watermark_url: string | null;
    theme_apply_to_app: boolean;
  };
}) {
  const [accent, setAccent] = useState(initial.theme_accent ?? DEFAULT_ACCENT);
  const [hasAccent, setHasAccent] = useState(initial.theme_accent != null);
  const [radius, setRadius] = useState<RadiusPreset | null>(
    initial.theme_radius && initial.theme_radius in RADIUS_PRESETS
      ? (initial.theme_radius as RadiusPreset)
      : null
  );
  const [font, setFont] = useState<FontPreset | null>(
    initial.theme_font && initial.theme_font in FONT_PRESETS ? (initial.theme_font as FontPreset) : null
  );
  const [watermarkUrl, setWatermarkUrl] = useState(initial.theme_watermark_url ?? "");
  const [applyToApp, setApplyToApp] = useState(initial.theme_apply_to_app);
  const formRef = useRef<HTMLFormElement>(null);

  const previewProfile = {
    theme_accent: hasAccent ? accent : null,
    theme_radius: radius,
    theme_font: font,
    theme_watermark_url: watermarkUrl || null,
  };

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-8">
      <input type="hidden" name="theme_accent" value={hasAccent ? accent : ""} />
      <input type="hidden" name="theme_radius" value={radius ?? ""} />
      <input type="hidden" name="theme_font" value={font ?? ""} />
      <input type="hidden" name="theme_watermark_url" value={watermarkUrl} />

      <section className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-muted)] p-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="theme_apply_to_app"
            checked={applyToApp}
            onChange={(e) => setApplyToApp(e.target.checked)}
          />
          <span className="font-medium">Also use this as my own personal look for the app</span>
        </label>
        <p className="text-sm text-[var(--text-muted)]">
          Off by default. Your recipes always show this design language to everyone, regardless of
          this setting. Turning this on additionally applies it to the rest of the app — nav bar,
          dashboard, browse page — but only in your own view. Other people&apos;s recipes you look
          at keep their own look (or the app default) either way.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-lg font-semibold">Accent color</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Used for buttons, highlights, and links on your recipes — visible to everyone who views
          them, not just you.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasAccent}
              onChange={(e) => setHasAccent(e.target.checked)}
            />
            <span className="text-sm">Use a custom accent color</span>
          </label>
          {hasAccent && (
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded border border-[var(--border)] bg-transparent"
            />
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-lg font-semibold">Corner style</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRadius(null)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              radius === null
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Default
          </button>
          {(Object.keys(RADIUS_PRESETS) as RadiusPreset[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRadius(key)}
              className={`border px-3 py-1.5 text-sm ${
                radius === key
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
              style={{ borderRadius: RADIUS_PRESETS[key].value }}
            >
              {RADIUS_PRESETS[key].label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-lg font-semibold">Heading font</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFont(null)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              font === null
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Default
          </button>
          {(Object.keys(FONT_PRESETS) as FontPreset[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFont(key)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                font === key
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
              style={{ fontFamily: FONT_PRESETS[key].value }}
            >
              {FONT_PRESETS[key].label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-lg font-semibold">Watermark</h2>
        <p className="text-sm text-[var(--text-muted)]">
          A small signature icon shown in the corner of your recipe cards, recipe pages, and Cook
          Mode.
        </p>
        <div className="flex items-center gap-3">
          {watermarkUrl ? (
            <div className="relative h-16 w-16">
              <EditableImage
                src={watermarkUrl}
                initialShape="square"
                outputWidth={200}
                className="h-16 w-16"
                onChange={(url) => setWatermarkUrl(url)}
              />
              <button
                type="button"
                onClick={() => setWatermarkUrl("")}
                aria-label="Remove watermark"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--danger)] text-xs text-white"
              >
                ×
              </button>
            </div>
          ) : (
            <PhotoPicker initialShape="square" outputWidth={200} onAdd={(url) => setWatermarkUrl(url)}>
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                + Add
              </div>
            </PhotoPicker>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-lg font-semibold">Preview</h2>
        <div
          className="flex items-center gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]"
          style={buildThemeStyle(previewProfile)}
        >
          <span className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white">
            Button
          </span>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 font-serif text-xs text-[var(--accent)]">
            Tag
          </span>
          <h3 className="font-serif text-lg font-semibold">Recipe title</h3>
        </div>
      </section>

      <SubmitButton
        pendingLabel="Saving…"
        className="self-start rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
      >
        Save
      </SubmitButton>
    </form>
  );
}
