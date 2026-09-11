import { describe, expect, it } from "vitest";
import { convertQuantity, isConvertibleUnit } from "./unitConversion";

describe("isConvertibleUnit", () => {
  it("recognizes known cooking units", () => {
    expect(isConvertibleUnit("cup")).toBe(true);
    expect(isConvertibleUnit("Tbsp")).toBe(true);
    expect(isConvertibleUnit("g")).toBe(true);
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

  it("picks the larger display unit once the amount reaches it", () => {
    const result = convertQuantity(1500, "g", "metric");
    expect(result.unit).toBe("kg");
    expect(result.amount).toBeCloseTo(1.5, 3);
  });

  it("leaves an already-matching-system unit unchanged", () => {
    expect(convertQuantity(2, "cup", "us")).toEqual({ amount: 2, unit: "cup" });
  });

  it("leaves unrecognized units unchanged", () => {
    expect(convertQuantity(3, "clove", "metric")).toEqual({ amount: 3, unit: "clove" });
  });
});
