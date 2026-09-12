"use server";

import { createClient } from "@/lib/supabase/server";

// Feedback on Cook Mode's ingredient-to-step highlighting: thumbs up means
// "keep matching this", thumbs down means "stop matching this" for that
// exact (step, ingredient, word) triple. Upserted so re-voting just changes
// the existing row instead of piling up duplicates.
export async function submitIngredientMatchFeedback(input: {
  recipeId: string;
  stepId: string;
  ingredientId: string;
  word: string;
  vote: "up" | "down";
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase.from("ingredient_match_feedback").upsert(
    {
      user_id: user.id,
      recipe_id: input.recipeId,
      step_id: input.stepId,
      ingredient_id: input.ingredientId,
      word: input.word.toLowerCase(),
      vote: input.vote,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,step_id,ingredient_id,word" }
  );

  if (error) return { error: error.message };
  return { ok: true };
}
