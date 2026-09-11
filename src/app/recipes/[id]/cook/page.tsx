import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CookMode } from "@/components/CookMode";
import { OfflineCacheWriter } from "@/components/OfflineCacheWriter";
import type { RecipeWithDetails } from "@/types/recipe";

type OwnerTheme = {
  theme_accent: string | null;
  theme_radius: string | null;
  theme_font: string | null;
  theme_watermark_url: string | null;
};

export default async function CookModePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      "*, recipe_ingredients(*), recipe_steps(*), profiles!recipes_owner_id_fkey(theme_accent, theme_radius, theme_font, theme_watermark_url)"
    )
    .eq("id", id)
    .single<RecipeWithDetails & { profiles: OwnerTheme | null }>();

  if (!recipe) notFound();

  const ingredients = [...recipe.recipe_ingredients].sort((a, b) => a.position - b.position);
  const steps = [...recipe.recipe_steps].sort((a, b) => a.position - b.position);

  return (
    <>
      <OfflineCacheWriter
        recipe={{
          id: recipe.id,
          title: recipe.title,
          baseServings: recipe.servings ?? 1,
          servingUnit: recipe.serving_unit,
          totalMinutes: recipe.total_minutes,
          ownerTheme: recipe.profiles,
          ingredients,
          equipment: recipe.equipment,
          steps,
        }}
      />
      <CookMode
        recipeId={recipe.id}
        title={recipe.title}
        baseServings={recipe.servings ?? 1}
        servingUnit={recipe.serving_unit}
        totalMinutes={recipe.total_minutes}
        ownerTheme={recipe.profiles}
        ingredients={ingredients}
        equipment={recipe.equipment}
        steps={steps}
      />
    </>
  );
}
