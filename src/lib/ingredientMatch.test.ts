import { describe, expect, it } from "vitest";
import {
  findMentionedCategories,
  findMentionedIngredients,
  mentionedWordMap,
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

  it("matches a singular ingredient name against a plural mention in the step", () => {
    const ingredients = [ing("1", "Egg")];
    expect(findMentionedIngredients("Whisk the eggs together.", ingredients).map((i) => i.id)).toEqual(["1"]);
  });

  it("matches a plural ingredient name against a singular mention in the step", () => {
    const ingredients = [ing("1", "Tomatoes")];
    expect(findMentionedIngredients("Dice the tomato finely.", ingredients).map((i) => i.id)).toEqual(["1"]);
  });

  it("matches a two-word ingredient name as one phrase, not crediting a shared word to a different ingredient", () => {
    // "baking" is shared between these two ingredient names — without
    // phrase matching, a step that only mentions "baking powder" would
    // wrongly also credit "Baking Soda" just because it shares that word.
    const ingredients = [ing("1", "Baking Powder"), ing("2", "Baking Soda")];
    const result = findMentionedIngredients("Add the baking powder and mix.", ingredients);
    expect(result.map((i) => i.id)).toEqual(["1"]);
  });

  it("does not strip a trailing s from words too short to stem safely", () => {
    // "Gas" is only 3 letters — stripping its trailing "s" would produce a
    // nonsense 2-letter word ("ga"), so it should still match "gas" itself
    // (unstemmed) but not a totally different word.
    const ingredients = [ing("1", "Gas Grill")];
    expect(findMentionedIngredients("Light the gas grill.", ingredients).map((i) => i.id)).toEqual(["1"]);
    expect(findMentionedIngredients("Turn on the burner.", ingredients)).toEqual([]);
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

describe("mentionedWordMap", () => {
  it("maps each matched word to the ingredient it came from", () => {
    const ingredients = [ing("1", "Large Strawberries"), ing("2", "Ricotta")];
    const map = mentionedWordMap("Wash the strawberries.", ingredients);
    expect(map.get("strawberries")?.id).toBe("1");
    expect(map.size).toBe(1);
  });

  it("keeps the first ingredient when a word is shared", () => {
    const ingredients = [ing("1", "Cream Cheese"), ing("2", "Whipped Cheese")];
    const map = mentionedWordMap("Add the cheese now.", ingredients);
    expect(map.get("cheese")?.id).toBe("1");
  });

  it("maps a matched two-word phrase to a single entry, not one per word", () => {
    const ingredients = [ing("1", "Baking Powder"), ing("2", "Baking Soda")];
    const map = mentionedWordMap("Add the baking powder and mix.", ingredients);
    expect(map.size).toBe(1);
    expect(map.get("baking powder")?.id).toBe("1");
  });

  it("still matches a phrase ingredient by singular/plural on its last word", () => {
    const ingredients = [ing("1", "Chocolate Chip")];
    const map = mentionedWordMap("Fold in the chocolate chips.", ingredients);
    expect(map.get("chocolate chips")?.id).toBe("1");
  });

  it("matches a trailing word pair from a longer name as one phrase", () => {
    // The full name never appears verbatim, but "chicken breast" does — it
    // should highlight as one phrase, not "chicken" and "breast" separately.
    const ingredients = [ing("1", "Boneless, Skinless Chicken Breast")];
    const map = mentionedWordMap("Pat the chicken breast dry with paper towels.", ingredients);
    expect(map.size).toBe(1);
    expect(map.get("chicken breast")?.id).toBe("1");
  });

  it("only lights up once for a name whose words appear but not contiguously", () => {
    const ingredients = [ing("1", "Salt and Pepper")];
    const map = mentionedWordMap("Add salt and black pepper to taste.", ingredients);
    expect(map.size).toBe(1);
  });
});

describe("findMentionedCategories", () => {
  function ingWithCategory(id: string, name: string, category: string | null) {
    return { id, name, category };
  }

  it("highlights a category whose name is mentioned, when nothing in it is individually highlighted", () => {
    const ingredients = [ingWithCategory("1", "Ricotta", "Cheese Options")];
    const result = findMentionedCategories("Add some basil.", ingredients, new Set());
    expect(result).toEqual([]); // "basil" doesn't mention the category at all
    expect(
      findMentionedCategories("Add some cheese.", ingredients, new Set())
    ).toEqual(["Cheese Options"]);
  });

  it("suppresses the category when the matched word is specific to the ingredient, not the category", () => {
    const ingredients = [ingWithCategory("1", "Ricotta", "Cheese Options")];
    // "ricotta" matched ingredient 1, and "ricotta" isn't a word in "Cheese
    // Options" — a genuinely specific match, so the category stays off.
    const result = findMentionedCategories("Add the ricotta.", ingredients, new Set(["1"]));
    expect(result).toEqual([]);
  });

  it("keeps the category highlighted when the matched word is shared with the category's own name", () => {
    const ingredients = [ingWithCategory("1", "Whipped Cream Cheese", "Cheese Options")];
    // "cheese" matched the ingredient, but "cheese" is also a word in
    // "Cheese Options" itself — too generic to say it means only this one
    // ingredient (there could be other cheeses in the same category), so
    // the category highlight is NOT suppressed.
    const result = findMentionedCategories(
      "Top with some cheese.",
      ingredients,
      new Set(["1"])
    );
    expect(result).toEqual(["Cheese Options"]);
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
