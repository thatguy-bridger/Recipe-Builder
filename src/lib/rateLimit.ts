import type { createClient } from "@/lib/supabase/server";

// Lightweight, DB-backed rate limit: counts rows the caller has inserted
// under `key` in the last `windowMinutes`, refusing once `max` is reached.
// Backed by recipe_app.rate_limit_events, which RLS restricts to each
// user's own rows, so this only ever counts the current user's own events.
export async function checkRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  key: string,
  max: number,
  windowMinutes: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("key", key)
    .gte("created_at", since);

  if ((count ?? 0) >= max) return false;

  await supabase.from("rate_limit_events").insert({ user_id: userId, key });
  return true;
}
