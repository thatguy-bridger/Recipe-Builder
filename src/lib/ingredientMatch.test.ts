import { describe, expect, it } from "vitest";
import { findMentionedIngredients, splitByTerms } from "./ingredientMatch";

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

describe("splitByTerms", () => {
  it("returns the whole text unmatched when there are no terms", () => {
    expect(splitByTerms("Mix the ricotta.", [])).toEqual([{ text: "Mix the ricotta.", matched: false }]);
  });

  it("tags the matching segment", () => {
    const result = splitByTerms("Mix the ricotta well.", ["ricotta"]);
    expect(result.map((s) => s.matched)).toEqual([false, true, false]);
    expect(result.find((s) => s.matched)?.text.toLowerCase()).toBe("ricotta");
  });

  it("matches case-insensitively while preserving original casing", () => {
    const result = splitByTerms("Add the Ricotta now.", ["ricotta"]);
    expect(result.find((s) => s.matched)?.text).toBe("Ricotta");
  });

  it("prefers the longer term when one term is a substring of another", () => {
    const result = splitByTerms("Add all-purpose flour.", ["Flour", "All-Purpose Flour"]);
    const matches = result.filter((s) => s.matched).map((s) => s.text);
    expect(matches).toEqual(["all-purpose flour"]);
  });
});
