import Link from "next/link";
import type { Recipe } from "@/types/recipe";
import { buildIsolatedThemeStyle } from "@/lib/designLanguage";
import { FavoriteButton } from "./FavoriteButton";

type OwnerTheme = {
  theme_accent: string | null;
  theme_radius: string | null;
  theme_font: string | null;
  theme_watermark_url: string | null;
};

export function RecipeCard({
  recipe,
  photoUrl,
  canEdit = false,
  ownerTheme,
  isFavorite,
}: {
  recipe: Recipe;
  photoUrl?: string;
  canEdit?: boolean;
  ownerTheme?: OwnerTheme | null;
  isFavorite?: boolean;
}) {
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
      style={buildIsolatedThemeStyle(ownerTheme)}
    >
      <Link href={`/recipes/${recipe.id}`} className="absolute inset-0 z-0" aria-label={recipe.title} />
      {ownerTheme?.theme_watermark_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ownerTheme.theme_watermark_url}
          alt=""
          className="pointer-events-none absolute bottom-2 left-2 z-10 h-6 w-6 rounded-full object-cover opacity-80 shadow-[var(--shadow)]"
        />
      )}

      <div className="pointer-events-none flex flex-1 flex-col">
        <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--bg-muted)]">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={recipe.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">🍽️</div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-lg font-semibold leading-tight">{recipe.title}</h3>
            {recipe.total_minutes && (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                ⏱ {recipe.total_minutes} min
              </span>
            )}
          </div>
          {recipe.description && (
            <p className="line-clamp-2 text-sm text-[var(--text-muted)]">{recipe.description}</p>
          )}
          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-serif text-xs text-[var(--accent)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-2 top-2 z-10 flex gap-1.5">
        {isFavorite != null && <FavoriteButton recipeId={recipe.id} initialFavorite={isFavorite} />}
        <Link
          href={`/recipes/${recipe.id}/cook`}
          aria-label="Cook mode"
          title="Cook mode"
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sm text-white backdrop-blur hover:bg-black/80"
        >
          🍳
        </Link>
        {canEdit && (
          <Link
            href={`/recipes/${recipe.id}/edit`}
            aria-label="Edit recipe"
            title="Edit recipe"
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sm text-white backdrop-blur hover:bg-black/80"
          >
            ✎
          </Link>
        )}
      </div>
    </div>
  );
}
