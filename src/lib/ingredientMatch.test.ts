import { describe, expect, it } from "vitest";
import { findMentionedIngredients } from "./ingredientMatch";

function ing(id: string, name: string) {
  return { id, name };
}

describe("findMentionedIngredients", () => {
  it("matches an ingredient name mentioned in the step body, case-insensitively", () => {
    const ingredients = [ing("1", "Ricotta"), ing("2", "Basil")];
    const result = findMentionedIngredients("Place the ricotta in a bowl.", ingredients);
    expect(result.map((i) => i.id)).toEqual(["1"]);
  });

  it("matches multiple ingredients mentioned in the same step", () => {
    const ingredients = [ing("1", "Ricotta"), ing("2", "Basil"), ing("3", "Salt")];
    const result = findMentionedIngredients(
      "Mix the ricotta with basil and a little salt.",
      ingredients
    );
    expect(result.map((i) => i.id).sort()).toEqual(["1", "2", "3"]);
  });

  it("returns nothing when no ingredient is mentioned", () => {
    const ingredients = [ing("1", "Ricotta")];
    expect(findMentionedIngredients("Preheat the oven.", ingredients)).toEqual([]);
  });

  it("matches multi-word ingredient names", () => {
    const ingredients = [ing("1", "All-Purpose Flour")];
    const result = findMentionedIngredients("Whisk in the all-purpose flour.", ingredients);
    expect(result.map((i) => i.id)).toEqual(["1"]);
  });

  it("ignores ingredients with a blank name", () => {
    const ingredients = [ing("1", "  ")];
    expect(findMentionedIngredients("Some step text.", ingredients)).toEqual([]);
  });
});
