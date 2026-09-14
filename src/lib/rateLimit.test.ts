import { describe, expect, it, vi } from "vitest";
import { checkRateLimit, reserveRateLimitSlots } from "./rateLimit";

function mockSupabase(rpcImpl: (fn: string, args: unknown) => Promise<{ data: unknown; error: unknown }>) {
  return { rpc: vi.fn(rpcImpl) } as unknown as Parameters<typeof reserveRateLimitSlots>[0];
}

describe("reserveRateLimitSlots", () => {
  it("returns 0 without calling the database when nothing is requested", async () => {
    const rpc = vi.fn();
    const supabase = { rpc } as unknown as Parameters<typeof reserveRateLimitSlots>[0];
    const result = await reserveRateLimitSlots(supabase, "u1", "import", 10, 60, 0);
    expect(result).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("delegates the count-then-insert to the atomic reserve_rate_limit_slots RPC", async () => {
    const supabase = mockSupabase(async () => ({ data: 3, error: null }));
    const result = await reserveRateLimitSlots(supabase, "u1", "import", 10, 60, 5);
    expect(result).toBe(3);
    expect(supabase.rpc).toHaveBeenCalledWith("reserve_rate_limit_slots", {
      p_user_id: "u1",
      p_key: "import",
      p_max: 10,
      p_window_minutes: 60,
      p_requested: 5,
    });
  });

  it("returns 0 when the RPC reports no data", async () => {
    const supabase = mockSupabase(async () => ({ data: null, error: null }));
    const result = await reserveRateLimitSlots(supabase, "u1", "import", 10, 60, 5);
    expect(result).toBe(0);
  });

  it("throws when the RPC errors, rather than silently granting nothing", async () => {
    const supabase = mockSupabase(async () => ({ data: null, error: new Error("boom") }));
    await expect(reserveRateLimitSlots(supabase, "u1", "import", 10, 60, 5)).rejects.toThrow("boom");
  });
});

describe("checkRateLimit", () => {
  it("is true only when exactly one slot was granted", async () => {
    const supabase = mockSupabase(async () => ({ data: 1, error: null }));
    expect(await checkRateLimit(supabase, "u1", "invite", 5, 60)).toBe(true);
  });

  it("is false when no slot was granted", async () => {
    const supabase = mockSupabase(async () => ({ data: 0, error: null }));
    expect(await checkRateLimit(supabase, "u1", "invite", 5, 60)).toBe(false);
  });
});
