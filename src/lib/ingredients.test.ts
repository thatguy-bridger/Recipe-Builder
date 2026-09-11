import { describe, expect, it } from "vitest";
import { formatIngredientLine } from "./ingredients";

function ing(overrides: Partial<Parameters<typeof formatIngredientLine>[0]>) {
  return {
    amount: null,
    unit: null,
    name: "Ingredient",
    note: null,
    ...overrides,
  };
}

describe("formatIngredientLine", () => {
  it("combines amount, unit, and name into one line", () => {
    expect(formatIngredientLine(ing({ amount: 1.5, unit: "cup", name: "All-Purpose Flour" }))).toBe(
      "1 1/2 cup All-Purpose Flour"
    );
  });

  it("omits the amount/unit segment entirely when there's no amount", () => {
    expect(formatIngredientLine(ing({ name: "Orange Zest" }))).toBe("Orange Zest");
  });

  it("handles an amount with no unit", () => {
    expect(formatIngredientLine(ing({ amount: 2, name: "Eggs" }))).toBe("2 Eggs");
  });

  it("appends a note after a comma", () => {
    expect(
      formatIngredientLine(ing({ amount: 1, unit: "cup", name: "Ricotta", note: "drained" }))
    ).toBe("1 cup Ricotta, drained");
  });

  it("appends a note even with no amount or unit", () => {
    expect(formatIngredientLine(ing({ name: "Orange Zest", note: "for garnish" }))).toBe(
      "Orange Zest, for garnish"
    );
  });

  it("trims a blank unit or note rather than leaving stray whitespace", () => {
    expect(formatIngredientLine(ing({ amount: 2, unit: "  ", name: "Eggs", note: "  " }))).toBe(
      "2 Eggs"
    );
  });
});
