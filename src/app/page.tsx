import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RecipeCard } from "@/components/RecipeCard";

const PAGE_SIZE = 24;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; favorites?: string; page?: string }>;
}) {
  const { q, tag, favorites, page: pageParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const page = Math.max(1, Number(pageParam) || 1);
  const favoritesOnly = favorites === "1";

  const { data: searchResult, error: searchError } = await supabase.rpc("search_recipes", {
    p_query: q?.trim() || null,
    p_tag: tag || null,
    p_favorites_only: favoritesOnly,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });

  const ids = (searchResult ?? []).map((r: { id: string }) => r.id);
  const total = searchResult?.[0]?.total_count ?? 0;

  let recipes: Awaited<ReturnType<typeof fetchRecipes>> = [];
  if (ids.length > 0) {
    recipes = await fetchRecipes(supabase, ids);
  }

  // All tags, for the filter row — from a lightweight separate query so it's
  // not limited to just the current page's results.
  const { data: allRecipes } = await supabase.from("recipes").select("tags").eq("is_published", true);
  const allTags = Array.from(new Set((allRecipes ?? []).flatMap((r) => r.tags))).sort();

  let favoriteIds = new Set<string>();
  let editableIds = new Set<string>();
  if (user) {
    const [{ data: favRows }, { data: collabRows }] = await Promise.all([
      supabase.from("recipe_favorites").select("recipe_id").eq("user_id", user.id),
      supabase.from("recipe_collaborators").select("recipe_id").eq("user_id", user.id).eq("permission", "edit"),
    ]);
    favoriteIds = new Set((favRows ?? []).map((f) => f.recipe_id));
    editableIds = new Set([
      ...recipes.filter((r) => r.owner_id === user.id).map((r) => r.id),
      ...(collabRows ?? []).map((c) => c.recipe_id),
    ]);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const baseParams = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    if (favoritesOnly) params.set("favorites", "1");
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Recipe Boxed</h1>
        <p className="text-[var(--text-muted)]">
          Every recipe, in one place — search, browse, and cook.
        </p>
      </div>

      <form className="mb-6 flex flex-wrap items-center gap-3" action="/">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search recipes, ingredients, even steps..."
          className="w-full max-w-sm rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm outline-none focus:border-[var(--accent)] sm:w-auto"
        />
        {tag && <input type="hidden" name="tag" value={tag} />}
        <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <input type="checkbox" name="favorites" value="1" defaultChecked={favoritesOnly} />
          Favorites only
        </label>
        <button
          type="submit"
          className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm hover:bg-[var(--bg-muted)]"
        >
          Search
        </button>
      </form>

      {allTags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href={(() => {
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              if (favoritesOnly) params.set("favorites", "1");
              const qs = params.toString();
              return qs ? `/?${qs}` : "/";
            })()}
            className={`rounded-full border px-3 py-1 font-serif text-xs ${
              !tag
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-muted)]"
            }`}
          >
            All
          </Link>
          {allTags.map((t) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (favoritesOnly) params.set("favorites", "1");
            if (t !== tag) params.set("tag", t);
            const qs = params.toString();
            return (
              <Link
                key={t}
                href={qs ? `/?${qs}` : "/"}
                className={`rounded-full border px-3 py-1 font-serif text-xs ${
                  tag === t
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {t}
              </Link>
            );
          })}
        </div>
      )}

      {searchError && (
        <p className="mb-6 rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          Couldn&apos;t load recipes ({searchError.message}). Try refreshing.
        </p>
      )}

      {recipes.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] px-6 py-16 text-center text-[var(--text-muted)]">
          {total === 0 && !q && !tag && !favoritesOnly
            ? "No recipes yet. Sign in to add the first one."
            : "No recipes match your search."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => {
              const photos = [...recipe.recipe_photos].sort((a, b) => a.position - b.position);
              return (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  photoUrl={photos[0]?.url}
                  canEdit={editableIds.has(recipe.id)}
                  ownerTheme={recipe.profiles}
                  isFavorite={user ? favoriteIds.has(recipe.id) : undefined}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4 text-sm">
              {page > 1 ? (
                <Link href={baseParams(page - 1)} className="rounded-full border border-[var(--border)] px-4 py-1.5 hover:bg-[var(--bg-muted)]">
                  ← Prev
                </Link>
              ) : (
                <span className="rounded-full border border-[var(--border)] px-4 py-1.5 text-[var(--text-muted)] opacity-50">← Prev</span>
              )}
              <span className="text-[var(--text-muted)]">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={baseParams(page + 1)} className="rounded-full border border-[var(--border)] px-4 py-1.5 hover:bg-[var(--bg-muted)]">
                  Next →
                </Link>
              ) : (
                <span className="rounded-full border border-[var(--border)] px-4 py-1.5 text-[var(--text-muted)] opacity-50">Next →</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

async function fetchRecipes(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]) {
  const { data } = await supabase
    .from("recipes")
    .select(
      "*, recipe_photos(url, position), profiles!recipes_owner_id_fkey(theme_accent, theme_radius, theme_font, theme_watermark_url)"
    )
    .in("id", ids);
  // .in() doesn't preserve the RPC's relevance/recency order, so re-sort to match.
  const order = new Map(ids.map((id, i) => [id, i]));
  return (data ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
