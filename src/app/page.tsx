import { createClient } from "@/lib/supabase/server";
import { SearchableRecipes } from "@/components/SearchableRecipes";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: recipes } = await supabase
    .from("recipes")
    .select("*, recipe_photos(url, position), recipe_ingredients(name, notes), recipe_steps(body)")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Recipe Boxed</h1>
        <p className="text-[var(--text-muted)]">
          Every recipe, in one place — search, browse, and cook.
        </p>
      </div>

      <SearchableRecipes recipes={recipes ?? []} />
    </div>
  );
}
