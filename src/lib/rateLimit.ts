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
//
// The count-then-insert is done atomically in the reserve_rate_limit_slots
// Postgres function (advisory-locked per user+key) rather than here in JS —
// two concurrent requests each reading a stale count in separate round
// trips could otherwise both be granted slots that together exceed `max`.
// The function also opportunistically deletes this user's own expired
// events for the key, so the table doesn't grow unbounded.
export async function reserveRateLimitSlots(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  key: string,
  max: number,
  windowMinutes: number,
  requested: number
): Promise<number> {
  if (requested <= 0) return 0;

  const { data, error } = await supabase.rpc("reserve_rate_limit_slots", {
    p_user_id: userId,
    p_key: key,
    p_max: max,
    p_window_minutes: windowMinutes,
    p_requested: requested,
  });
  if (error) throw error;
  return data ?? 0;
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
