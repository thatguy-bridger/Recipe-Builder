"use server";

import { createClient } from "@/lib/supabase/server";

// Feedback on Cook Mode's ingredient-to-step highlighting: thumbs up means
// "keep matching this", thumbs down means "stop matching this" for that
// exact (step, ingredient, word) triple. A thumbs down can also carry a
// suggested fix — the ingredient the word should have matched instead (or
// null to say it isn't an ingredient at all) — so the highlight can be
// corrected rather than just removed. Upserted so re-voting/re-correcting
// just changes the existing row instead of piling up duplicates.
export async function submitIngredientMatchFeedback(input: {
  recipeId: string;
  stepId: string;
  ingredientId: string;
  word: string;
  vote: "up" | "down";
  correctedIngredientId?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  if (input.vote !== "up" && input.vote !== "down") return { error: "Invalid vote" };
  const word = input.word.trim().toLowerCase();
  if (!word || word.length > 100) return { error: "Invalid word" };

  // Confirm the step and both ingredients actually belong to the claimed
  // recipe — without this, a caller could tie feedback to any (step,
  // ingredient) pair regardless of which recipe they're really in,
  // poisoning the global word-preference learning for unrelated recipes.
  const ingredientIds = Array.from(
    new Set([input.ingredientId, ...(input.correctedIngredientId ? [input.correctedIngredientId] : [])])
  );
  const [{ data: step }, { data: ingredients }] = await Promise.all([
    supabase.from("recipe_steps").select("id").eq("id", input.stepId).eq("recipe_id", input.recipeId).maybeSingle(),
    supabase.from("recipe_ingredients").select("id").eq("recipe_id", input.recipeId).in("id", ingredientIds),
  ]);
  if (!step) return { error: "Step does not belong to that recipe" };
  if ((ingredients?.length ?? 0) !== ingredientIds.length) {
    return { error: "Ingredient does not belong to that recipe" };
  }

  const { error } = await supabase.from("ingredient_match_feedback").upsert(
    {
      user_id: user.id,
      recipe_id: input.recipeId,
      step_id: input.stepId,
      ingredient_id: input.ingredientId,
      word,
      vote: input.vote,
      corrected_ingredient_id: input.correctedIngredientId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,step_id,ingredient_id,word" }
  );

  if (error) return { error: error.message };
  return { ok: true };
}
