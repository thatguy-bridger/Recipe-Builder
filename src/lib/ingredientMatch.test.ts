import { describe, expect, it } from "vitest";
import {
  findMentionedCategories,
  findMentionedIngredients,
  mentionedWords,
  splitByTerms,
  textIsMentioned,
} from "./ingredientMatch";

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

  it("matches on a single word even when the rest of the name isn't mentioned", () => {
    const ingredients = [ing("1", "Large Strawberries")];
    const result = findMentionedIngredients(
      "Wash the strawberries and cut into brunoise.",
      ingredients
    );
    expect(result.map((i) => i.id)).toEqual(["1"]);
  });

  it("is case-insensitive on a single-word match", () => {
    const ingredients = [ing("1", "Orange Zest")];
    expect(findMentionedIngredients("Add the ZEST from an orange.", ingredients).map((i) => i.id)).toEqual([
      "1",
    ]);
  });

  it("does not match on stop words or short words alone", () => {
    // "A Bit Of Salt" reduces to significant words ["bit", "salt"] — "a" and
    // "of" are stop words, so a step mentioning neither "bit" nor "salt"
    // shouldn't match just because it happens to contain "a" or "of".
    const ingredients = [ing("1", "A Bit Of Salt")];
    expect(findMentionedIngredients("Add a little of this.", ingredients)).toEqual([]);
  });
});

describe("textIsMentioned", () => {
  it("matches a single significant word", () => {
    expect(textIsMentioned("Add the ricotta and basil.", "Cheese Options")).toBe(false);
    expect(textIsMentioned("Add some cheese on top.", "Cheese Options")).toBe(true);
  });
});

describe("mentionedWords", () => {
  it("returns only the words that actually matched, not full names", () => {
    const ingredients = [ing("1", "Large Strawberries"), ing("2", "Ricotta")];
    const words = mentionedWords("Wash the strawberries.", ingredients);
    expect(words).toEqual(["strawberries"]);
  });

  it("dedupes words shared across ingredients", () => {
    const ingredients = [ing("1", "Cream Cheese"), ing("2", "Whipped Cheese")];
    const words = mentionedWords("Add the cheese now.", ingredients);
    expect(words).toEqual(["cheese"]);
  });
});

describe("findMentionedCategories", () => {
  function ingWithCategory(id: string, name: string, category: string | null) {
    return { id, name, category };
  }

  it("highlights a category whose name is mentioned", () => {
    const ingredients = [ingWithCategory("1", "Ricotta", "Cheese Options")];
    const result = findMentionedCategories("Add some cheese.", ingredients, new Set());
    expect(result).toEqual(["Cheese Options"]);
  });

  it("suppresses the category when one of its ingredients is already highlighted", () => {
    const ingredients = [ingWithCategory("1", "Cheese Spread", "Cheese Options")];
    // "cheese" matched ingredient 1 already — the category shouldn't also light up.
    const result = findMentionedCategories("Add the cheese spread.", ingredients, new Set(["1"]));
    expect(result).toEqual([]);
  });

  it("still highlights an unrelated category even when another ingredient is highlighted", () => {
    const ingredients = [
      ingWithCategory("1", "Ricotta", "Cheese Options"),
      ingWithCategory("2", "Basil", "Topping Options"),
    ];
    const result = findMentionedCategories(
      "Add basil and some cheese.",
      ingredients,
      new Set(["2"])
    );
    expect(result).toEqual(["Cheese Options"]);
  });

  it("ignores uncategorized ingredients", () => {
    const ingredients = [ingWithCategory("1", "Ricotta", null)];
    expect(findMentionedCategories("Add cheese.", ingredients, new Set())).toEqual([]);
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
