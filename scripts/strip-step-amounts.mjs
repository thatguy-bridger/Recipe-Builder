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

const UPDATES_PATH =
  "/private/tmp/claude-99058729/-Users-bridger-jones-Recipe-Builder/b3ff783d-0484-4cfc-b193-d82e3c53c083/scratchpad/step_updates.json";

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: process.env.IMPORT_EMAIL,
    password: process.env.IMPORT_PASSWORD,
  });
  if (signInError) throw signInError;

  const updates = JSON.parse(readFileSync(UPDATES_PATH, "utf-8"));

  let ok = 0;
  let failed = 0;
  for (const { id, body } of updates) {
    const { error } = await supabase.from("recipe_steps").update({ body }).eq("id", id);
    if (error) {
      console.error("FAILED", id, error.message);
      failed++;
    } else {
      ok++;
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
