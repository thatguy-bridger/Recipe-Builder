import { describe, expect, it } from "vitest";
import { formatFraction, parseFraction } from "./fractions";

describe("parseFraction", () => {
  it("parses simple fractions", () => {
    expect(parseFraction("1/2")).toBe(0.5);
    expect(parseFraction("3/4")).toBe(0.75);
  });

  it("parses mixed numbers", () => {
    expect(parseFraction("1 1/2")).toBe(1.5);
    expect(parseFraction("2 3/4")).toBe(2.75);
  });

  it("parses whole numbers", () => {
    expect(parseFraction("2")).toBe(2);
    expect(parseFraction("10")).toBe(10);
  });

  it("falls back to decimal parsing", () => {
    expect(parseFraction("0.5")).toBe(0.5);
  });

  it("returns null for empty or invalid input", () => {
    expect(parseFraction("")).toBeNull();
    expect(parseFraction("   ")).toBeNull();
    expect(parseFraction("abc")).toBeNull();
  });

  it("returns null for a zero denominator", () => {
    expect(parseFraction("1/0")).toBeNull();
    expect(parseFraction("1 1/0")).toBeNull();
  });
});

describe("formatFraction", () => {
  it("formats whole numbers with no fraction", () => {
    expect(formatFraction(2)).toBe("2");
    expect(formatFraction(0)).toBe("0");
  });

  it("formats simple fractions", () => {
    expect(formatFraction(0.5)).toBe("1/2");
    expect(formatFraction(0.25)).toBe("1/4");
    expect(formatFraction(0.75)).toBe("3/4");
  });

  it("formats mixed numbers", () => {
    expect(formatFraction(1.5)).toBe("1 1/2");
    expect(formatFraction(2.25)).toBe("2 1/4");
  });

  it("snaps a value very close to the next whole number up", () => {
    expect(formatFraction(2.995)).toBe("3");
  });

  it("never renders a decimal point", () => {
    for (const n of [0.5, 1.5, 0.25, 2.75, 3, 1 / 3]) {
      expect(formatFraction(n)).not.toContain(".");
    }
  });

  it("returns an empty string for null", () => {
    expect(formatFraction(null)).toBe("");
  });
});
