"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { titleCase } from "@/lib/text";
import { parseFraction } from "@/lib/fractions";

type IngredientInput = { amount: string; unit: string; name: string; category: string; note: string };
type StepInput = { body: string; photo_urls: string[]; is_pinned: boolean; timer_minutes: string };

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
  const total = String(formData.get("total_minutes") || "").trim() || null;
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
      total_minutes: total,
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

  const title = titleCase(String(formData.get("title")));
  const description = String(formData.get("description") || "");
  const servings = Number(formData.get("servings")) || 4;
  const servingUnit = titleCase(String(formData.get("serving_unit") || "Serving").trim()) || "Serving";
  const prep = String(formData.get("prep_minutes") || "").trim() || null;
  const cook = String(formData.get("cook_minutes") || "").trim() || null;
  const total = String(formData.get("total_minutes") || "").trim() || null;
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
  // Only ever allow redirecting to this recipe's own cook page — never trust
  // an arbitrary path from form data.
  const requestedRedirect = String(formData.get("redirect_to") || "").trim();
  const safeRedirect =
    requestedRedirect === `/recipes/${recipeId}/cook` ? requestedRedirect : `/recipes/${recipeId}`;

  // Everything below is independent of everything else (different tables, or
  // uses only the pre-fetched `existing` snapshot), so run it all at once
  // instead of one round trip at a time.
  await Promise.all([
    existing
      ? supabase.from("recipe_versions").insert({
          recipe_id: recipeId,
          snapshot: existing,
          edited_by: user.id,
        })
      : Promise.resolve(),
    supabase
      .from("recipes")
      .update({
        title,
        description,
        servings,
        serving_unit: servingUnit,
        prep_minutes: prep,
        cook_minutes: cook,
        total_minutes: total,
        tags,
        equipment,
        video_url: videoUrl,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipeId),
    (async () => {
      // Old children must be fully cleared before the new ones are written,
      // or a race could delete the rows we just inserted.
      await Promise.all([
        supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId),
        supabase.from("recipe_steps").delete().eq("recipe_id", recipeId),
        supabase.from("recipe_photos").delete().eq("recipe_id", recipeId),
      ]);
      await writeChildren(recipeId, ingredients, steps, photoUrls);
    })(),
  ]);

  revalidatePath("/dashboard");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(safeRedirect);
}

async function writeChildren(
  recipeId: string,
  ingredients: IngredientInput[],
  steps: StepInput[],
  photoUrls: string[]
) {
  const supabase = await createClient();

  await Promise.all([
    ingredients.length > 0
      ? supabase.from("recipe_ingredients").insert(
          ingredients.map((ing, i) => ({
            recipe_id: recipeId,
            position: i,
            amount: ing.amount ? parseFraction(ing.amount) : null,
            unit: ing.unit || null,
            name: titleCase(ing.name),
            category: ing.category ? titleCase(ing.category) : null,
            note: ing.note || null,
          }))
        )
      : Promise.resolve(),
    steps.length > 0
      ? supabase.from("recipe_steps").insert(
          steps.map((step, i) => ({
            recipe_id: recipeId,
            position: i,
            body: step.body,
            photo_urls: step.photo_urls,
            is_pinned: step.is_pinned,
            timer_minutes: step.timer_minutes || null,
          }))
        )
      : Promise.resolve(),
    photoUrls.length > 0
      ? supabase.from("recipe_photos").insert(
          photoUrls.map((url, i) => ({
            recipe_id: recipeId,
            url,
            position: i,
          }))
        )
      : Promise.resolve(),
  ]);
}

export async function deleteRecipe(recipeId: string) {
  const supabase = await createClient();
  await supabase.from("recipes").delete().eq("id", recipeId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function duplicateRecipe(recipeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*), recipe_steps(*), recipe_photos(*)")
    .eq("id", recipeId)
    .single();

  if (!existing) redirect(`/recipes/${recipeId}`);

  const { data: copy, error } = await supabase
    .from("recipes")
    .insert({
      owner_id: user.id,
      title: `${existing.title} (Copy)`,
      description: existing.description,
      servings: existing.servings,
      serving_unit: existing.serving_unit,
      prep_minutes: existing.prep_minutes,
      cook_minutes: existing.cook_minutes,
      total_minutes: existing.total_minutes,
      tags: existing.tags,
      equipment: existing.equipment,
      video_url: existing.video_url,
      is_published: false,
    })
    .select()
    .single();

  if (error || !copy) {
    redirect(`/recipes/${recipeId}?error=${encodeURIComponent(error?.message || "Duplicate failed")}`);
  }

  const ingredients = (existing.recipe_ingredients ?? []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  );
  const steps = (existing.recipe_steps ?? []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  );
  const photos = (existing.recipe_photos ?? []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  );

  await Promise.all([
    ingredients.length > 0
      ? supabase.from("recipe_ingredients").insert(
          ingredients.map(
            (ing: {
              position: number;
              amount: number | null;
              unit: string | null;
              name: string;
              category: string | null;
              note: string | null;
            }) => ({
              recipe_id: copy.id,
              position: ing.position,
              amount: ing.amount,
              unit: ing.unit,
              name: ing.name,
              category: ing.category,
              note: ing.note,
            })
          )
        )
      : Promise.resolve(),
    steps.length > 0
      ? supabase.from("recipe_steps").insert(
          steps.map(
            (step: {
              position: number;
              body: string;
              photo_urls: string[];
              is_pinned: boolean;
              timer_minutes: string | null;
            }) => ({
              recipe_id: copy.id,
              position: step.position,
              body: step.body,
              photo_urls: step.photo_urls,
              is_pinned: step.is_pinned,
              timer_minutes: step.timer_minutes,
            })
          )
        )
      : Promise.resolve(),
    photos.length > 0
      ? supabase.from("recipe_photos").insert(
          photos.map((p: { position: number; url: string }) => ({
            recipe_id: copy.id,
            position: p.position,
            url: p.url,
          }))
        )
      : Promise.resolve(),
  ]);

  revalidatePath("/dashboard");
  redirect(`/recipes/${copy.id}/edit`);
}

type RecipeSnapshot = {
  title: string;
  description: string | null;
  servings: number | null;
  serving_unit: string;
  prep_minutes: string | null;
  cook_minutes: string | null;
  total_minutes: string | null;
  tags: string[];
  equipment: string[];
  video_url: string | null;
  is_published: boolean;
  recipe_ingredients: {
    position: number;
    amount: number | null;
    unit: string | null;
    name: string;
    category: string | null;
    note: string | null;
  }[];
  recipe_steps: {
    position: number;
    body: string;
    photo_urls: string[];
    is_pinned: boolean;
    timer_minutes: string | null;
  }[];
  recipe_photos: { position: number; url: string }[];
};

export async function restoreVersion(recipeId: string, versionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: version } = await supabase
    .from("recipe_versions")
    .select("snapshot")
    .eq("id", versionId)
    .eq("recipe_id", recipeId)
    .single();

  if (!version) redirect(`/recipes/${recipeId}/edit`);
  const snapshot = version.snapshot as RecipeSnapshot;

  // Snapshot the current (pre-restore) state too, so restoring is itself undoable.
  const { data: current } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*), recipe_steps(*), recipe_photos(*)")
    .eq("id", recipeId)
    .single();

  await Promise.all([
    current
      ? supabase.from("recipe_versions").insert({
          recipe_id: recipeId,
          snapshot: current,
          edited_by: user.id,
        })
      : Promise.resolve(),
    supabase
      .from("recipes")
      .update({
        title: snapshot.title,
        description: snapshot.description,
        servings: snapshot.servings,
        serving_unit: snapshot.serving_unit,
        prep_minutes: snapshot.prep_minutes,
        cook_minutes: snapshot.cook_minutes,
        total_minutes: snapshot.total_minutes,
        tags: snapshot.tags,
        equipment: snapshot.equipment,
        video_url: snapshot.video_url,
        is_published: snapshot.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipeId),
    (async () => {
      await Promise.all([
        supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId),
        supabase.from("recipe_steps").delete().eq("recipe_id", recipeId),
        supabase.from("recipe_photos").delete().eq("recipe_id", recipeId),
      ]);
      await Promise.all([
        (snapshot.recipe_ingredients ?? []).length > 0
          ? supabase.from("recipe_ingredients").insert(
              snapshot.recipe_ingredients.map((ing) => ({ ...ing, recipe_id: recipeId }))
            )
          : Promise.resolve(),
        (snapshot.recipe_steps ?? []).length > 0
          ? supabase
              .from("recipe_steps")
              .insert(snapshot.recipe_steps.map((s) => ({ ...s, recipe_id: recipeId })))
          : Promise.resolve(),
        (snapshot.recipe_photos ?? []).length > 0
          ? supabase
              .from("recipe_photos")
              .insert(snapshot.recipe_photos.map((p) => ({ ...p, recipe_id: recipeId })))
          : Promise.resolve(),
      ]);
    })(),
  ]);

  revalidatePath("/dashboard");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
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
    revalidatePath(`/recipes/${recipeId}/edit`);
    redirect(`/recipes/${recipeId}/edit?invited=1`);
  }

  redirect(`/recipes/${recipeId}/edit?error=${encodeURIComponent("No approved account found with that email")}`);
}
