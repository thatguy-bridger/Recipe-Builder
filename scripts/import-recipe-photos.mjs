#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = "https://pfobqnctixdpdzzrtriu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_umxKO6i22PagOYmJ0B6aSA_EvgRsuGV";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: "recipe_app" },
});

const MAPPING_PATH =
  "/private/tmp/claude-99058729/-Users-bridger-jones-Recipe-Builder/b3ff783d-0484-4cfc-b193-d82e3c53c083/scratchpad/title_to_file.json";
const IMAGE_MAPPING_PATH =
  "/private/tmp/claude-99058729/-Users-bridger-jones-Recipe-Builder/b3ff783d-0484-4cfc-b193-d82e3c53c083/scratchpad/title_to_image.json";

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: process.env.IMPORT_EMAIL,
    password: process.env.IMPORT_PASSWORD,
  });
  if (signInError) throw signInError;

  const titleToFile = JSON.parse(readFileSync(MAPPING_PATH, "utf-8"));
  const titleToImage = JSON.parse(readFileSync(IMAGE_MAPPING_PATH, "utf-8"));

  let ok = 0;
  let failed = 0;
  for (const [title, filePath] of Object.entries(titleToFile)) {
    const recipeId = titleToImage[title]?.recipe_id;
    if (!recipeId) {
      console.error("No recipe id for", title);
      failed++;
      continue;
    }
    try {
      const bytes = readFileSync(filePath);
      const remotePath = `curriculum/${recipeId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("recipe-photos")
        .upload(remotePath, bytes, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("recipe-photos").getPublicUrl(remotePath);

      // Remove any existing photo at position 0 for this recipe, then insert fresh.
      const { data: existing } = await supabase
        .from("recipe_photos")
        .select("id")
        .eq("recipe_id", recipeId)
        .eq("position", 0);
      if (existing && existing.length > 0) {
        await supabase
          .from("recipe_photos")
          .delete()
          .in("id", existing.map((e) => e.id));
      }

      const { error: insertError } = await supabase
        .from("recipe_photos")
        .insert({ recipe_id: recipeId, url: pub.publicUrl, position: 0 });
      if (insertError) throw insertError;

      console.log("OK", title, "->", pub.publicUrl);
      ok++;
    } catch (e) {
      console.error("FAILED", title, e.message || e);
      failed++;
    }
  }
  console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
