import { describe, expect, it, vi, beforeEach } from "vitest";

const state = {
  user: null as { id: string } | null,
  rateLimitGranted: 1,
  cached: null as Record<string, unknown> | null,
  recipe: {
    title: "Mashed Potatoes",
    description: "Creamy and simple.",
    equipment: ["potato masher"],
    recipe_ingredients: [{ id: "ing-1", name: "potatoes", category: null, note: "peeled", position: 0 }],
    recipe_steps: [{ id: "step-1", body: "Boil the potatoes.", position: 0 }],
  } as Record<string, unknown> | null,
  upsertCalls: [] as unknown[],
};

vi.mock("@/lib/translation/googleTranslate", () => ({
  translateBatch: vi.fn(async (texts: string[]) => texts.map((t) => (t ? `T:${t}` : t))),
}));

function selectQuery(table: string) {
  if (table === "recipe_translations") {
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: async () => ({ data: state.cached }),
    };
    return builder;
  }
  if (table === "recipes") {
    const builder = {
      select: () => builder,
      eq: () => builder,
      single: async () => ({ data: state.recipe }),
    };
    return builder;
  }
  throw new Error(`unexpected table ${table}`);
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => selectQuery(table),
    rpc: async (name: string, args: unknown) => {
      if (name === "reserve_rate_limit_slots") return { data: state.rateLimitGranted };
      if (name === "upsert_recipe_translation") {
        state.upsertCalls.push(args);
        return { data: null, error: null };
      }
      throw new Error(`unexpected rpc ${name}`);
    },
  }),
}));

const { getRecipeTranslation } = await import("./translate");

beforeEach(() => {
  state.user = null;
  state.rateLimitGranted = 1;
  state.cached = null;
  state.upsertCalls = [];
  state.recipe = {
    title: "Mashed Potatoes",
    description: "Creamy and simple.",
    equipment: ["potato masher"],
    recipe_ingredients: [{ id: "ing-1", name: "potatoes", category: null, note: "peeled", position: 0 }],
    recipe_steps: [{ id: "step-1", body: "Boil the potatoes.", position: 0 }],
  };
});

describe("getRecipeTranslation", () => {
  it("rejects an unsupported language", async () => {
    const result = await getRecipeTranslation("recipe-1", "xx", null);
    expect(result).toEqual({ error: "Unsupported language" });
  });

  it("rejects a variant that doesn't belong to the language", async () => {
    const result = await getRecipeTranslation("recipe-1", "es", "fr-CA");
    expect("error" in result).toBe(true);
  });

  it("translates and caches a recipe on a cold cache", async () => {
    const result = await getRecipeTranslation("recipe-1", "es", null);
    expect("data" in result).toBe(true);
    if (!("data" in result)) throw new Error("expected data");
    expect(result.data.title).toBe("T:Mashed Potatoes");
    expect(result.data.ingredients).toEqual([
      { id: "ing-1", name: "T:potatoes", category: null, note: "T:peeled" },
    ]);
    expect(result.data.steps).toEqual([{ id: "step-1", body: "T:Boil the potatoes." }]);
    expect(state.upsertCalls).toHaveLength(1);
  });

  it("uses the cache instead of re-translating", async () => {
    state.cached = {
      title: "Cached title",
      description: null,
      equipment: [],
      ingredients: [],
      steps: [],
    };
    const result = await getRecipeTranslation("recipe-1", "es", null);
    if (!("data" in result)) throw new Error("expected data");
    expect(result.data.title).toBe("Cached title");
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("applies the glossary for a sublanguage on top of cached base text", async () => {
    state.cached = {
      title: "Corta las patatas",
      description: null,
      equipment: [],
      ingredients: [{ id: "ing-1", name: "patatas", category: null, note: null }],
      steps: [],
    };
    const result = await getRecipeTranslation("recipe-1", "es", "es-LA");
    if (!("data" in result)) throw new Error("expected data");
    expect(result.data.title).toBe("Corta las papas");
    expect(result.data.ingredients[0].name).toBe("papas");
  });

  it("returns an error when the recipe can't be found", async () => {
    state.recipe = null;
    const result = await getRecipeTranslation("recipe-1", "es", null);
    expect(result).toEqual({ error: "Recipe not found" });
  });

  it("rate-limits signed-in users", async () => {
    state.user = { id: "user-1" };
    state.rateLimitGranted = 0;
    const result = await getRecipeTranslation("recipe-1", "es", null);
    expect("error" in result).toBe(true);
  });

  it("does not rate-limit anonymous viewers", async () => {
    state.user = null;
    state.rateLimitGranted = 0;
    const result = await getRecipeTranslation("recipe-1", "es", null);
    expect("data" in result).toBe(true);
  });
});
