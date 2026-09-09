#!/usr/bin/env node
/**
 * Imports one recipe (parsed from a PDF into JSON) into the live database.
 *
 * Usage:
 *   node scripts/import-recipe.mjs path/to/recipe.json
 *
 * Requires IMPORT_EMAIL / IMPORT_PASSWORD in .env.local (an approved account —
 * the recipe is created under that account as owner). Photo paths in the JSON
 * are read from disk relative to the JSON file's own directory and uploaded to
 * the recipe-photos storage bucket; recipe.photos / step.photo entries that are
 * already http(s) URLs are used as-is.
 *
 * JSON shape (all fields but title/ingredients/steps are optional):
 * {
 *   "title": "Grandma's Chili",
 *   "description": "...",
 *   "servings": 6,
 *   "prep_minutes": 15,
 *   "cook_minutes": 90,
 *   "tags": ["Soup", "Dinner"],
 *   "equipment": ["Dutch oven"],
 *   "video_url": null,
 *   "photos": ["images/chili-1.jpg"],
 *   "ingredients": [
 *     { "amount": 1, "unit": "lb", "name": "ground beef", "notes": "" }
 *   ],
 *   "steps": [
 *     { "body": "Brown the beef.", "photo": "images/step1.jpg" }
 *   ]
 * }
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, extname } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pfobqnctixdpdzzrtriu.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_umxKO6i22PagOYmJ0B6aSA_EvgRsuGV";

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Usage: node scripts/import-recipe.mjs path/to/recipe.json");
  process.exit(1);
}

const email = process.env.IMPORT_EMAIL;
const password = process.env.IMPORT_PASSWORD;
if (!email || !password) {
  console.error("Set IMPORT_EMAIL and IMPORT_PASSWORD in .env.local (an approved account).");
  process.exit(1);
}

const absJsonPath = resolve(jsonPath);
const baseDir = dirname(absJsonPath);
const recipe = JSON.parse(readFileSync(absJsonPath, "utf-8"));

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: "recipe_app" },
});

function isUrl(s) {
  return /^https?:\/\//.test(s || "");
}

function titleCase(input) {
  if (!input) return input;
  return input
    .split(/(\s+)/)
    .map((word) => {
      if (/^\s+$/.test(word) || word.length === 0) return word;
      if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

async function uploadLocalPhoto(relPath) {
  if (isUrl(relPath)) return relPath;
  const fullPath = resolve(baseDir, relPath);
  if (!existsSync(fullPath)) {
    console.warn(`  ! photo not found, skipping: ${fullPath}`);
    return null;
  }
  const bytes = readFileSync(fullPath);
  const ext = extname(fullPath).slice(1) || "jpg";
  const storagePath = `${crypto.randomUUID()}.${ext}`;
  const contentType =
    { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" }[
      ext.toLowerCase()
    ] || "application/octet-stream";

  const { error } = await supabase.storage
    .from("recipe-photos")
    .upload(storagePath, bytes, { contentType });
  if (error) {
    console.warn(`  ! upload failed for ${relPath}: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from("recipe-photos").getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  const ownerId = signInData.user.id;
  console.log(`Signed in as ${email} (${ownerId})`);

  console.log(`Importing "${recipe.title}"...`);

  const photoUrls = [];
  for (const p of recipe.photos || []) {
    const url = await uploadLocalPhoto(p);
    if (url) photoUrls.push(url);
  }

  const stepsWithPhotos = [];
  for (const step of recipe.steps || []) {
    const photoUrl = step.photo ? await uploadLocalPhoto(step.photo) : null;
    stepsWithPhotos.push({ body: step.body, photo_url: photoUrl });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("recipes")
    .insert({
      owner_id: ownerId,
      title: titleCase(recipe.title),
      description: recipe.description || null,
      servings: recipe.servings ?? 4,
      prep_minutes: recipe.prep_minutes ?? null,
      cook_minutes: recipe.cook_minutes ?? null,
      tags: (recipe.tags || []).map(titleCase),
      equipment: (recipe.equipment || []).map(titleCase),
      video_url: recipe.video_url || null,
      is_published: recipe.is_published ?? true,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  const recipeId = inserted.id;

  if (recipe.ingredients?.length) {
    const { error } = await supabase.from("recipe_ingredients").insert(
      recipe.ingredients.map((ing, i) => ({
        recipe_id: recipeId,
        position: i,
        amount: ing.amount ?? null,
        unit: ing.unit || null,
        name: titleCase(ing.name),
        notes: ing.notes ? titleCase(ing.notes) : null,
      }))
    );
    if (error) throw error;
  }

  if (stepsWithPhotos.length) {
    const { error } = await supabase.from("recipe_steps").insert(
      stepsWithPhotos.map((s, i) => ({
        recipe_id: recipeId,
        position: i,
        body: s.body,
        photo_url: s.photo_url,
      }))
    );
    if (error) throw error;
  }

  if (photoUrls.length) {
    const { error } = await supabase.from("recipe_photos").insert(
      photoUrls.map((url, i) => ({ recipe_id: recipeId, url, position: i }))
    );
    if (error) throw error;
  }

  console.log(`Done: ${SUPABASE_URL.replace(".supabase.co", "")} -> recipe id ${recipeId}`);
  console.log(`View at /recipes/${recipeId}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
