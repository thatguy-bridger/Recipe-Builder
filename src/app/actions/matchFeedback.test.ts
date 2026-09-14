import { describe, expect, it, vi, beforeEach } from "vitest";

const state = {
  user: { id: "user-1" } as { id: string } | null,
  steps: [{ id: "step-1", recipe_id: "recipe-1" }] as { id: string; recipe_id: string }[],
  ingredients: [{ id: "ing-1", recipe_id: "recipe-1" }] as { id: string; recipe_id: string }[],
  upserted: [] as unknown[],
  upsertError: null as { message: string } | null,
};

// A minimal stand-in for the Supabase query builder covering only the
// methods submitIngredientMatchFeedback actually calls, filtering the
// in-memory tables above the same way the real `.eq()`/`.in()` would.
function makeQuery(rows: Record<string, unknown>[]) {
  let filtered = rows;
  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      filtered = filtered.filter((r) => r[col] === val);
      return builder;
    },
    in: (col: string, vals: unknown[]) => {
      filtered = filtered.filter((r) => vals.includes(r[col]));
      return builder;
    },
    maybeSingle: async () => ({ data: filtered[0] ?? null }),
    then: (resolve: (v: { data: unknown[] }) => void) => resolve({ data: filtered }),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === "recipe_steps") return makeQuery(state.steps);
      if (table === "recipe_ingredients") return makeQuery(state.ingredients);
      if (table === "ingredient_match_feedback") {
        return {
          upsert: async (row: unknown) => {
            state.upserted.push(row);
            return { error: state.upsertError };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

const { submitIngredientMatchFeedback } = await import("./matchFeedback");

const validInput = {
  recipeId: "recipe-1",
  stepId: "step-1",
  ingredientId: "ing-1",
  word: "Cheese",
  vote: "down" as const,
};

beforeEach(() => {
  state.user = { id: "user-1" };
  state.steps = [{ id: "step-1", recipe_id: "recipe-1" }];
  state.ingredients = [{ id: "ing-1", recipe_id: "recipe-1" }];
  state.upserted = [];
  state.upsertError = null;
});

describe("submitIngredientMatchFeedback", () => {
  it("requires the user to be signed in", async () => {
    state.user = null;
    const result = await submitIngredientMatchFeedback(validInput);
    expect(result).toEqual({ error: "Not signed in" });
  });

  it("rejects a vote that isn't up or down", async () => {
    // @ts-expect-error deliberately invalid for the test
    const result = await submitIngredientMatchFeedback({ ...validInput, vote: "sideways" });
    expect(result).toEqual({ error: "Invalid vote" });
  });

  it("rejects an empty word", async () => {
    const result = await submitIngredientMatchFeedback({ ...validInput, word: "   " });
    expect(result).toEqual({ error: "Invalid word" });
  });

  it("rejects a step that belongs to a different recipe", async () => {
    state.steps = [{ id: "step-1", recipe_id: "some-other-recipe" }];
    const result = await submitIngredientMatchFeedback(validInput);
    expect(result).toEqual({ error: "Step does not belong to that recipe" });
    expect(state.upserted).toHaveLength(0);
  });

  it("rejects an ingredient that belongs to a different recipe", async () => {
    state.ingredients = [{ id: "ing-1", recipe_id: "some-other-recipe" }];
    const result = await submitIngredientMatchFeedback(validInput);
    expect(result).toEqual({ error: "Ingredient does not belong to that recipe" });
    expect(state.upserted).toHaveLength(0);
  });

  it("rejects a corrected ingredient that belongs to a different recipe", async () => {
    state.ingredients = [
      { id: "ing-1", recipe_id: "recipe-1" },
      { id: "ing-2", recipe_id: "some-other-recipe" },
    ];
    const result = await submitIngredientMatchFeedback({ ...validInput, correctedIngredientId: "ing-2" });
    expect(result).toEqual({ error: "Ingredient does not belong to that recipe" });
  });

  it("lowercases and trims the word before storing it", async () => {
    const result = await submitIngredientMatchFeedback({ ...validInput, word: "  Cheese  " });
    expect(result).toEqual({ ok: true });
    expect(state.upserted).toEqual([expect.objectContaining({ word: "cheese" })]);
  });

  it("surfaces the database error instead of claiming success", async () => {
    state.upsertError = { message: "constraint violated" };
    const result = await submitIngredientMatchFeedback(validInput);
    expect(result).toEqual({ error: "constraint violated" });
  });
});
