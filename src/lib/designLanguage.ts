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

// Builds inline CSS custom-property overrides for a viewer's own personal
// design language — used on the general app chrome (nav bar, dashboard,
// browse page, etc). Only sets the properties the viewer actually
// customized; anything left unset just inherits normally, same as if this
// wrapper weren't here at all.
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

// Builds inline CSS custom-property overrides for a recipe's own look —
// used on RecipeCard, the recipe detail page, and Cook Mode. Unlike
// buildThemeStyle above, this ALWAYS pins every property, falling back to
// the app's true --*-default values (via var() indirection, not a copied
// value) rather than omitting them. That isolates a recipe's appearance
// from whatever ancestor context it's rendered in — most importantly, a
// viewer's own personal design language never leaks into recipe content,
// whether the recipe's owner has customized their look or not.
export function buildIsolatedThemeStyle(profile: ThemeProfile | null | undefined): React.CSSProperties {
  const variants = profile?.theme_accent ? accentVariants(profile.theme_accent) : null;
  const style: Record<string, string> = {
    "--accent": variants ? profile!.theme_accent! : "var(--accent-default)",
    "--accent-hover": variants ? variants.hover : "var(--accent-hover-default)",
    "--accent-soft": variants ? variants.soft : "var(--accent-soft-default)",
    "--radius": isRadiusPreset(profile?.theme_radius ?? null)
      ? RADIUS_PRESETS[profile!.theme_radius as RadiusPreset].value
      : "var(--radius-default)",
    "--font-serif": isFontPreset(profile?.theme_font ?? null)
      ? FONT_PRESETS[profile!.theme_font as FontPreset].value
      : "var(--font-serif-default)",
  };
  return style as React.CSSProperties;
}
