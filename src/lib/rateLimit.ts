import type { createClient } from "@/lib/supabase/server";

// Lightweight, DB-backed rate limit: counts rows the caller has inserted
// under `key` in the last `windowMinutes`, and reserves up to `requested`
// more against the remaining headroom under `max` — returning how many
// were actually granted (0..requested) rather than an all-or-nothing
// boolean. A single request asking for more than the remaining headroom
// still gets partial credit instead of being rejected outright, which
// matters for something like a 20-recipe batch import against a 10/hour
// cap: it should import 10 and report the rest as rate-limited, not
// import zero forever because the one request was "too big".
// Backed by recipe_app.rate_limit_events, which RLS restricts to each
// user's own rows, so this only ever counts the current user's own events.
export async function reserveRateLimitSlots(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  key: string,
  max: number,
  windowMinutes: number,
  requested: number
): Promise<number> {
  if (requested <= 0) return 0;

  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("key", key)
    .gte("created_at", since);

  const allowed = Math.min(requested, Math.max(0, max - (count ?? 0)));
  if (allowed > 0) {
    await supabase
      .from("rate_limit_events")
      .insert(Array.from({ length: allowed }, () => ({ user_id: userId, key })));
  }
  return allowed;
}

// Simple boolean form for single-item actions (e.g. one invite).
export async function checkRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  key: string,
  max: number,
  windowMinutes: number
): Promise<boolean> {
  return (await reserveRateLimitSlots(supabase, userId, key, max, windowMinutes, 1)) === 1;
}
