import { createClient } from "@/lib/supabase/server";
import { RecipeCard } from "@/components/RecipeCard";
import type { Recipe } from "@/types/recipe";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("recipes")
    .select("*, recipe_photos(url, position)")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data: recipes } = await query;

  const allTags = Array.from(
    new Set((recipes ?? []).flatMap((r: Recipe) => r.tags))
  ).sort();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">The Recipe Box</h1>
        <p className="text-[var(--text-muted)]">
          Every recipe, in one place — search, browse, and cook.
        </p>
      </div>

      <form className="mb-6 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search recipes..."
          className="w-full max-w-sm rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm outline-none focus:border-[var(--accent)] sm:w-auto"
        />
        {tag && <input type="hidden" name="tag" value={tag} />}
        <button
          type="submit"
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Search
        </button>
      </form>

      {allTags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <a
            href="/"
            className={`rounded-full border px-3 py-1 text-xs ${
              !tag
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-muted)]"
            }`}
          >
            All
          </a>
          {allTags.map((t) => (
            <a
              key={t}
              href={`/?tag=${encodeURIComponent(t)}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                tag === t
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-muted)]"
              }`}
            >
              {t}
            </a>
          ))}
        </div>
      )}

      {!recipes || recipes.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] px-6 py-16 text-center text-[var(--text-muted)]">
          No recipes yet. Sign in to add the first one.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => {
            const photos = (recipe.recipe_photos ?? []).sort(
              (a: { position: number }, b: { position: number }) => a.position - b.position
            );
            return (
              <RecipeCard key={recipe.id} recipe={recipe} photoUrl={photos[0]?.url} />
            );
          })}
        </div>
      )}
    </div>
  );
}
