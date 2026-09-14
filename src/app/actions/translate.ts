"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { resolveTarget } from "@/lib/translation/languages";
import { translateBatch } from "@/lib/translation/googleTranslate";
import { applyGlossary } from "@/lib/translation/glossary";

export type TranslatedIngredient = {
  id: string;
  name: string;
  category: string | null;
  note: string | null;
};

export type TranslatedStep = { id: string; body: string };

export type RecipeTranslation = {
  title: string;
  description: string | null;
  equipment: string[];
  ingredients: TranslatedIngredient[];
  steps: TranslatedStep[];
};

type IngredientRow = { id: string; name: string; category: string | null; note: string | null; position: number };
type StepRow = { id: string; body: string; position: number };

export async function getRecipeTranslation(
  recipeId: string,
  languageCode: string,
  variantCode: string | null
): Promise<{ data: RecipeTranslation } | { error: string }> {
  const target = resolveTarget(languageCode, variantCode);
  if (!target) return { error: "Unsupported language" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Anonymous share-link viewers can still trigger a first-time translation
  // (and benefit from the cache afterward) — only signed-in requests are
  // rate-limited, since only they have a stable id to key the limit on.
  if (user) {
    const allowed = await checkRateLimit(supabase, user.id, "translate", 60, 60);
    if (!allowed) return { error: "Too many translation requests — try again in a bit." };
  }

  const { data: cached } = await supabase
    .from("recipe_translations")
    .select("title, description, equipment, ingredients, steps")
    .eq("recipe_id", recipeId)
    .eq("google_code", target.googleCode)
    .maybeSingle<RecipeTranslation>();

  let base: RecipeTranslation;
  if (cached) {
    base = cached;
  } else {
    const { data: recipe } = await supabase
      .from("recipes")
      .select("title, description, equipment, recipe_ingredients(id, name, category, note, position), recipe_steps(id, body, position)")
      .eq("id", recipeId)
      .single<{
        title: string;
        description: string | null;
        equipment: string[];
        recipe_ingredients: IngredientRow[];
        recipe_steps: StepRow[];
      }>();
    if (!recipe) return { error: "Recipe not found" };

    const ingredients = [...recipe.recipe_ingredients].sort((a, b) => a.position - b.position);
    const steps = [...recipe.recipe_steps].sort((a, b) => a.position - b.position);

    const texts: string[] = [recipe.title, recipe.description ?? ""];
    for (const eq of recipe.equipment) texts.push(eq);
    for (const ing of ingredients) {
      texts.push(ing.name, ing.category ?? "", ing.note ?? "");
    }
    for (const step of steps) texts.push(step.body);

    let translated: string[];
    try {
      translated = await translateBatch(texts, target.googleCode);
    } catch {
      return { error: "Translation service is temporarily unavailable — try again in a bit." };
    }

    let i = 0;
    const title = translated[i++];
    const descriptionText = translated[i++];
    const description = recipe.description ? descriptionText : null;
    const equipment = recipe.equipment.map(() => translated[i++]);
    const translatedIngredients: TranslatedIngredient[] = ingredients.map((ing) => {
      const name = translated[i++];
      const categoryText = translated[i++];
      const noteText = translated[i++];
      return {
        id: ing.id,
        name,
        category: ing.category ? categoryText : null,
        note: ing.note ? noteText : null,
      };
    });
    const translatedSteps: TranslatedStep[] = steps.map((step) => ({ id: step.id, body: translated[i++] }));

    base = { title, description, equipment, ingredients: translatedIngredients, steps: translatedSteps };

    const { error } = await supabase.rpc("upsert_recipe_translation", {
      p_recipe_id: recipeId,
      p_google_code: target.googleCode,
      p_title: base.title,
      p_description: base.description,
      p_equipment: base.equipment,
      p_ingredients: base.ingredients,
      p_steps: base.steps,
    });
    // Cache write failing shouldn't fail the request — worst case the next
    // viewer pays for the same translation again.
    if (error) console.error("Failed to cache recipe translation:", error.message);
  }

  const glossaryName = target.glossaryName;
  if (!glossaryName) return { data: base };

  return {
    data: {
      title: applyGlossary(base.title, glossaryName),
      description: base.description ? applyGlossary(base.description, glossaryName) : null,
      equipment: base.equipment.map((eq) => applyGlossary(eq, glossaryName)),
      ingredients: base.ingredients.map((ing) => ({
        id: ing.id,
        name: applyGlossary(ing.name, glossaryName),
        category: ing.category ? applyGlossary(ing.category, glossaryName) : null,
        note: ing.note ? applyGlossary(ing.note, glossaryName) : null,
      })),
      steps: base.steps.map((step) => ({ id: step.id, body: applyGlossary(step.body, glossaryName) })),
    },
  };
}
