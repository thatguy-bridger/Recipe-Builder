"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { titleCase } from "@/lib/text";
import { parseFraction } from "@/lib/fractions";

type IngredientInput = { amount: string; unit: string; name: string; category: string; note: string };
type StepInput = { body: string; photo_url: string; is_pinned: boolean };

function parseIngredients(raw: string): IngredientInput[] {
  return JSON.parse(raw);
}
function parseSteps(raw: string): StepInput[] {
  return JSON.parse(raw);
}

export async function createRecipe(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = titleCase(String(formData.get("title")));
  const description = String(formData.get("description") || "");
  const servings = Number(formData.get("servings")) || 4;
  const servingUnit = titleCase(String(formData.get("serving_unit") || "Serving").trim()) || "Serving";
  const prep = String(formData.get("prep_minutes") || "").trim() || null;
  const cook = String(formData.get("cook_minutes") || "").trim() || null;
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((t) => titleCase(t.trim()))
    .filter(Boolean);
  const equipment = String(formData.get("equipment") || "")
    .split(",")
    .map((t) => titleCase(t.trim()))
    .filter(Boolean);
  const videoUrl = String(formData.get("video_url") || "") || null;
  const isPublished = formData.get("is_published") === "on";
  const ingredients = parseIngredients(String(formData.get("ingredients") || "[]"));
  const steps = parseSteps(String(formData.get("steps") || "[]"));
  const photoUrls = String(formData.get("photo_urls") || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      owner_id: user.id,
      title,
      description,
      servings,
      serving_unit: servingUnit,
      prep_minutes: prep,
      cook_minutes: cook,
      tags,
      equipment,
      video_url: videoUrl,
      is_published: isPublished,
    })
    .select()
    .single();

  if (error || !recipe) {
    redirect(`/dashboard/new?error=${encodeURIComponent(error?.message || "Failed to create")}`);
  }

  await writeChildren(recipe.id, ingredients, steps, photoUrls);
  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(recipeId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // snapshot current state before overwriting
  const { data: existing } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*), recipe_steps(*), recipe_photos(*)")
    .eq("id", recipeId)
    .single();

  if (existing) {
    await supabase.from("recipe_versions").insert({
      recipe_id: recipeId,
      snapshot: existing,
      edited_by: user.id,
    });
  }

  const title = titleCase(String(formData.get("title")));
  const description = String(formData.get("description") || "");
  const servings = Number(formData.get("servings")) || 4;
  const servingUnit = titleCase(String(formData.get("serving_unit") || "Serving").trim()) || "Serving";
  const prep = String(formData.get("prep_minutes") || "").trim() || null;
  const cook = String(formData.get("cook_minutes") || "").trim() || null;
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((t) => titleCase(t.trim()))
    .filter(Boolean);
  const equipment = String(formData.get("equipment") || "")
    .split(",")
    .map((t) => titleCase(t.trim()))
    .filter(Boolean);
  const videoUrl = String(formData.get("video_url") || "") || null;
  const isPublished = formData.get("is_published") === "on";
  const ingredients = parseIngredients(String(formData.get("ingredients") || "[]"));
  const steps = parseSteps(String(formData.get("steps") || "[]"));
  const photoUrls = String(formData.get("photo_urls") || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  await supabase
    .from("recipes")
    .update({
      title,
      description,
      servings,
      serving_unit: servingUnit,
      prep_minutes: prep,
      cook_minutes: cook,
      tags,
      equipment,
      video_url: videoUrl,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recipeId);

  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
  await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);
  await supabase.from("recipe_photos").delete().eq("recipe_id", recipeId);
  await writeChildren(recipeId, ingredients, steps, photoUrls);

  revalidatePath("/dashboard");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}

async function writeChildren(
  recipeId: string,
  ingredients: IngredientInput[],
  steps: StepInput[],
  photoUrls: string[]
) {
  const supabase = await createClient();

  if (ingredients.length > 0) {
    await supabase.from("recipe_ingredients").insert(
      ingredients.map((ing, i) => ({
        recipe_id: recipeId,
        position: i,
        amount: ing.amount ? parseFraction(ing.amount) : null,
        unit: ing.unit || null,
        name: titleCase(ing.name),
        category: ing.category ? titleCase(ing.category) : null,
        note: ing.note || null,
      }))
    );
  }

  if (steps.length > 0) {
    await supabase.from("recipe_steps").insert(
      steps.map((step, i) => ({
        recipe_id: recipeId,
        position: i,
        body: step.body,
        photo_url: step.photo_url || null,
        is_pinned: step.is_pinned,
      }))
    );
  }

  if (photoUrls.length > 0) {
    await supabase.from("recipe_photos").insert(
      photoUrls.map((url, i) => ({
        recipe_id: recipeId,
        url,
        position: i,
      }))
    );
  }
}

export async function deleteRecipe(recipeId: string) {
  const supabase = await createClient();
  await supabase.from("recipes").delete().eq("id", recipeId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function inviteCollaborator(recipeId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = String(formData.get("email") || "").trim().toLowerCase();

  const { data: matches } = await supabase.rpc("find_approved_user_by_email", {
    lookup_email: email,
  });
  const match = matches?.[0];

  if (match) {
    await supabase.from("recipe_collaborators").insert({
      recipe_id: recipeId,
      user_id: match.id,
      invited_by: user.id,
    });
  }

  revalidatePath(`/recipes/${recipeId}/edit`);
}
