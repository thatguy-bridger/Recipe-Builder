import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CookMode } from "@/components/CookMode";
import { OfflineCacheWriter } from "@/components/OfflineCacheWriter";
import type { RecipeWithDetails } from "@/types/recipe";
import { buildFeedbackSets } from "@/lib/matchFeedback";

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

  // Every vote this cook has ever left, across all their recipes — used to
  // hide/correct exact instances they flagged, add brand-new connections
  // they suggested, and (once the same word/fix shows up on enough
  // different recipes) auto-apply it everywhere else too.
  type FeedbackQueryRow = {
    step_id: string;
    ingredient_id: string;
    word: string;
    recipe_id: string;
    vote: "up" | "down";
    corrected_ingredient_id: string | null;
    ingredient: { name: string } | null;
    corrected: { name: string } | null;
  };
  const { data: feedbackRows } = await supabase
    .from("ingredient_match_feedback")
    .select(
      `step_id, ingredient_id, word, recipe_id, vote, corrected_ingredient_id,
       ingredient:recipe_ingredients!ingredient_match_feedback_ingredient_id_fkey(name),
       corrected:recipe_ingredients!ingredient_match_feedback_corrected_ingredient_id_fkey(name)`
    )
    .returns<FeedbackQueryRow[]>();
  const ingredientNameById = new Map<string, string>();
  for (const r of feedbackRows ?? []) {
    if (r.ingredient) ingredientNameById.set(r.ingredient_id, r.ingredient.name);
    if (r.corrected_ingredient_id && r.corrected) {
      ingredientNameById.set(r.corrected_ingredient_id, r.corrected.name);
    }
  }
  const { suppressed, globalBlocklist, corrections, manualAdditions, preferredNameByWord } = buildFeedbackSets(
    feedbackRows ?? [],
    ingredientNameById
  );

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
        initialSuppressed={Array.from(suppressed)}
        initialGlobalBlocklist={Array.from(globalBlocklist)}
        initialCorrections={Array.from(corrections.entries())}
        initialManualAdditions={Array.from(manualAdditions.entries())}
        initialPreferredNameByWord={Array.from(preferredNameByWord.entries())}
      />
    </>
  );
}
