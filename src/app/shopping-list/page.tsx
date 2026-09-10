import { createClient } from "@/lib/supabase/server";
import { ShoppingListBuilder } from "@/components/ShoppingListBuilder";

export default async function ShoppingListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const query = supabase
    .from("recipes")
    .select("id, title, servings, serving_unit, recipe_ingredients(amount, unit, name)")
    .order("title", { ascending: true });

  const { data: recipes } = user
    ? await query.or(`is_published.eq.true,owner_id.eq.${user.id}`)
    : await query.eq("is_published", true);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Shopping List</h1>
        <p className="text-[var(--text-muted)]">
          Pick recipes and servings, and we&apos;ll combine everything into one list.
        </p>
      </div>
      <ShoppingListBuilder
        recipes={(recipes ?? []).map((r) => ({
          id: r.id,
          title: r.title,
          servings: r.servings ?? 1,
          serving_unit: r.serving_unit,
          recipe_ingredients: r.recipe_ingredients ?? [],
        }))}
      />
    </div>
  );
}
