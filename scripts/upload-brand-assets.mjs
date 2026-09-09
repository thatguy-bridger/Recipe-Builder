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

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: process.env.IMPORT_EMAIL,
    password: process.env.IMPORT_PASSWORD,
  });
  if (signInError) throw signInError;

  const files = [
    { local: "public/logo.png", remote: "brand/logo-64.png" },
    { local: "src/app/icon.png", remote: "brand/icon-128.png" },
  ];

  for (const f of files) {
    const bytes = readFileSync(f.local);
    const { error } = await supabase.storage
      .from("recipe-photos")
      .upload(f.remote, bytes, { contentType: "image/png", upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("recipe-photos").getPublicUrl(f.remote);
    console.log(f.local, "->", data.publicUrl);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
