import { describe, expect, it } from "vitest";
import { convertQuantity, isConvertibleUnit } from "./unitConversion";

describe("isConvertibleUnit", () => {
  it("recognizes known cooking units", () => {
    expect(isConvertibleUnit("cup")).toBe(true);
    expect(isConvertibleUnit("Tbsp")).toBe(true);
    expect(isConvertibleUnit("g")).toBe(true);
  });

  it("recognizes a wide range of spellings, abbreviations, and plurals for the same unit", () => {
    for (const spelling of ["cup", "Cup", "cups", "Cups", "C", "c", "cup.", "Cup."]) {
      expect(isConvertibleUnit(spelling)).toBe(true);
    }
    for (const spelling of ["tbsp", "Tbsp", "tbsps", "tbs", "tblsp", "tablespoon", "Tablespoons"]) {
      expect(isConvertibleUnit(spelling)).toBe(true);
    }
    for (const spelling of ["tsp", "tsps", "teaspoon", "Teaspoons", "tspn"]) {
      expect(isConvertibleUnit(spelling)).toBe(true);
    }
    for (const spelling of ["g", "G", "gram", "grams", "Grams", "gramme", "grammes"]) {
      expect(isConvertibleUnit(spelling)).toBe(true);
    }
    for (const spelling of ["ml", "mL", "milliliter", "milliliters", "millilitre", "cc"]) {
      expect(isConvertibleUnit(spelling)).toBe(true);
    }
  });

  it("distinguishes T (tablespoon) from t (teaspoon) by case", () => {
    expect(convertQuantity(1, "T", "metric")).toEqual(convertQuantity(1, "tbsp", "metric"));
    expect(convertQuantity(1, "t", "metric")).toEqual(convertQuantity(1, "tsp", "metric"));
  });

  it("rejects counts and unknown units", () => {
    expect(isConvertibleUnit("clove")).toBe(false);
    expect(isConvertibleUnit(null)).toBe(false);
    expect(isConvertibleUnit("")).toBe(false);
  });
});

describe("convertQuantity", () => {
  it("converts cups to a metric volume", () => {
    const result = convertQuantity(1, "cup", "metric");
    expect(result.unit).toBe("ml");
    expect(result.amount).toBeCloseTo(236.588, 1);
  });

  it("converts grams to ounces", () => {
    const result = convertQuantity(100, "g", "us");
    expect(result.unit).toBe("oz");
    expect(result.amount).toBeCloseTo(3.5274, 3);
  });

  it("never bumps to a bigger or smaller unit, no matter the magnitude", () => {
    // 200 cups converts to a lot of ml, but it's still ml — never "l".
    const big = convertQuantity(200, "cup", "metric");
    expect(big.unit).toBe("ml");
    expect(big.amount).toBeCloseTo(47317.6, 0);

    // And a tiny amount doesn't get bumped down to a smaller unit either.
    const small = convertQuantity(0.5, "tsp", "metric");
    expect(small.unit).toBe("ml");
    expect(small.amount).toBeCloseTo(2.464, 2);
  });

  it("leaves an already-matching-system unit exactly as authored, even a large amount", () => {
    // 5 cups is a lot, but it should stay "5 cups" rather than being
    // silently rewritten as "1 1/4 quart" — the recipe author's own unit
    // choice for a same-system amount is never second-guessed.
    expect(convertQuantity(5, "cup", "us")).toEqual({ amount: 5, unit: "cup" });
    expect(convertQuantity(1500, "g", "metric")).toEqual({ amount: 1500, unit: "g" });
  });

  it("leaves unrecognized units unchanged", () => {
    expect(convertQuantity(3, "clove", "metric")).toEqual({ amount: 3, unit: "clove" });
  });
});
