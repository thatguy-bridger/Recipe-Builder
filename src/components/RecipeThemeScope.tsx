import { buildThemeStyle } from "@/lib/designLanguage";

type ThemeProfile = {
  theme_accent: string | null;
  theme_radius: string | null;
  theme_font: string | null;
  theme_watermark_url: string | null;
};

// Scopes a recipe owner's design language (accent color, corner-radius
// style, font pairing, watermark) to everything inside it — every existing
// var(--accent)/var(--radius)/var(--font-serif) reference in the app picks
// up the override automatically, no per-component changes needed. Purely
// cosmetic: nothing here changes behavior.
export function RecipeThemeScope({
  profile,
  watermarkPosition = "bottom-right",
  className,
  children,
}: {
  profile?: ThemeProfile | null;
  watermarkPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  className?: string;
  children: React.ReactNode;
}) {
  const style = buildThemeStyle(profile);
  const positionClass = {
    "bottom-right": "bottom-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "top-right": "top-2 right-2",
    "top-left": "top-2 left-2",
  }[watermarkPosition];

  return (
    <div className={`relative ${className ?? ""}`} style={style}>
      {children}
      {profile?.theme_watermark_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.theme_watermark_url}
          alt=""
          className={`pointer-events-none absolute z-20 h-7 w-7 rounded-full object-cover opacity-80 shadow-[var(--shadow)] ${positionClass}`}
        />
      )}
    </div>
  );
}
