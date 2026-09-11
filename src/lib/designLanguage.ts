export const RADIUS_PRESETS = {
  sharp: { label: "Sharp", value: "4px" },
  soft: { label: "Soft", value: "14px" },
  round: { label: "Round", value: "22px" },
} as const;

export const FONT_PRESETS = {
  classic: {
    label: "Classic",
    value: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
  },
  modern: {
    label: "Modern",
    value: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
  playful: {
    label: "Playful",
    value: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif',
  },
} as const;

export type RadiusPreset = keyof typeof RADIUS_PRESETS;
export type FontPreset = keyof typeof FONT_PRESETS;

export function isRadiusPreset(value: string | null): value is RadiusPreset {
  return value != null && value in RADIUS_PRESETS;
}
export function isFontPreset(value: string | null): value is FontPreset {
  return value != null && value in FONT_PRESETS;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Derives the hover (darkened) and soft (translucent tint, so it reads
// correctly against either a light or dark page background) variants from
// a single user-picked accent color.
function accentVariants(accent: string): { hover: string; soft: string } | null {
  const rgb = hexToRgb(accent);
  if (!rgb) return null;
  const darken = (c: number) => Math.max(0, Math.round(c * 0.82));
  const hover = `rgb(${darken(rgb.r)}, ${darken(rgb.g)}, ${darken(rgb.b)})`;
  const soft = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`;
  return { hover, soft };
}

type ThemeProfile = {
  theme_accent: string | null;
  theme_radius: string | null;
  theme_font: string | null;
};

// Builds inline CSS custom-property overrides for a recipe owner's design
// language. Scoping these on a wrapping element (rather than editing
// globals.css) means every existing `var(--accent)` / `var(--radius)` /
// `var(--font-serif)` reference throughout the app picks them up
// automatically for that subtree, with no changes needed at each use site.
export function buildThemeStyle(profile: ThemeProfile | null | undefined): React.CSSProperties {
  if (!profile) return {};
  const style: Record<string, string> = {};

  if (profile.theme_accent) {
    const variants = accentVariants(profile.theme_accent);
    if (variants) {
      style["--accent"] = profile.theme_accent;
      style["--accent-hover"] = variants.hover;
      style["--accent-soft"] = variants.soft;
    }
  }
  if (isRadiusPreset(profile.theme_radius)) {
    style["--radius"] = RADIUS_PRESETS[profile.theme_radius].value;
  }
  if (isFontPreset(profile.theme_font)) {
    style["--font-serif"] = FONT_PRESETS[profile.theme_font].value;
  }

  return style as React.CSSProperties;
}
