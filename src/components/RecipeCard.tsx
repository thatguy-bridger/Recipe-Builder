import Link from "next/link";
import type { Recipe } from "@/types/recipe";

export function RecipeCard({ recipe, photoUrl }: { recipe: Recipe; photoUrl?: string }) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
    >
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
        <h3 className="font-serif text-lg font-semibold leading-tight">{recipe.title}</h3>
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
    </Link>
  );
}
