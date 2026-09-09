import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CookMode } from "@/components/CookMode";
import type { RecipeWithDetails } from "@/types/recipe";

export default async function CookModePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*), recipe_steps(*)")
    .eq("id", id)
    .single<RecipeWithDetails>();

  if (!recipe) notFound();

  const ingredients = [...recipe.recipe_ingredients].sort((a, b) => a.position - b.position);
  const steps = [...recipe.recipe_steps].sort((a, b) => a.position - b.position);

  return (
    <CookMode
      recipeId={recipe.id}
      title={recipe.title}
      baseServings={recipe.servings ?? 1}
      servingUnit={recipe.serving_unit}
      ingredients={ingredients}
      equipment={recipe.equipment}
      steps={steps}
    />
  );
}
