import { createClient } from "@/lib/supabase/server";
import { SearchableRecipes } from "@/components/SearchableRecipes";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recipes } = await supabase
    .from("recipes")
    .select(
      "*, recipe_photos(url, position), recipe_ingredients(name, category, note), recipe_steps(body)"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  // Which of these the current viewer can quick-edit from the card itself:
  // recipes they own, plus ones they've been added to as a collaborator.
  let editableIds: Set<string> | undefined;
  if (user) {
    const { data: collabRows } = await supabase
      .from("recipe_collaborators")
      .select("recipe_id")
      .eq("user_id", user.id);
    editableIds = new Set([
      ...(recipes ?? []).filter((r) => r.owner_id === user.id).map((r) => r.id),
      ...(collabRows ?? []).map((c) => c.recipe_id),
    ]);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Recipe Boxed</h1>
        <p className="text-[var(--text-muted)]">
          Every recipe, in one place — search, browse, and cook.
        </p>
      </div>

      <SearchableRecipes recipes={recipes ?? []} editableIds={editableIds} />
    </div>
  );
}
