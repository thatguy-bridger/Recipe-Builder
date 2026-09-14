import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOfflineRecipe, listOfflineRecipes, saveOfflineRecipe, type OfflineRecipe } from "./offlineCache";

function recipe(id: string, overrides: Partial<Omit<OfflineRecipe, "cachedAt">> = {}) {
  return {
    id,
    title: `Recipe ${id}`,
    baseServings: 4,
    servingUnit: "Serving",
    totalMinutes: null,
    ownerTheme: null,
    ingredients: [],
    equipment: [],
    steps: [],
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("saveOfflineRecipe / listOfflineRecipes / getOfflineRecipe", () => {
  it("round-trips a saved recipe", () => {
    saveOfflineRecipe(recipe("r1"));
    expect(getOfflineRecipe("r1")?.title).toBe("Recipe r1");
  });

  it("returns null for a recipe that was never cached", () => {
    expect(getOfflineRecipe("missing")).toBeNull();
  });

  it("lists cached recipes most-recently-cached first", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    saveOfflineRecipe(recipe("older"));
    vi.setSystemTime(2000);
    saveOfflineRecipe(recipe("newer"));
    vi.useRealTimers();

    expect(listOfflineRecipes().map((r) => r.id)).toEqual(["newer", "older"]);
  });

  it("re-saving the same recipe id updates it in place instead of duplicating", () => {
    saveOfflineRecipe(recipe("r1", { title: "First version" }));
    saveOfflineRecipe(recipe("r1", { title: "Updated version" }));
    expect(listOfflineRecipes()).toHaveLength(1);
    expect(getOfflineRecipe("r1")?.title).toBe("Updated version");
  });

  it("keeps only the most recent 20 recipes", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 25; i++) {
      vi.setSystemTime(i);
      saveOfflineRecipe(recipe(`r${i}`));
    }
    vi.useRealTimers();

    const cached = listOfflineRecipes();
    expect(cached).toHaveLength(20);
    // The 5 oldest (r0..r4) should have been evicted; the most recent
    // (r24) should still be there.
    expect(cached.map((r) => r.id)).toContain("r24");
    expect(cached.map((r) => r.id)).not.toContain("r0");
  });

  it("does not throw when localStorage is unavailable", () => {
    const original = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error("quota exceeded");
    };
    expect(() => saveOfflineRecipe(recipe("r1"))).not.toThrow();
    localStorage.setItem = original;
  });

  it("treats corrupted stored JSON as empty rather than throwing", () => {
    localStorage.setItem("offlineRecipes", "{not valid json");
    expect(listOfflineRecipes()).toEqual([]);
    expect(getOfflineRecipe("anything")).toBeNull();
  });
});
