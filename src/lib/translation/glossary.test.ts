import { describe, expect, it } from "vitest";
import { applyGlossary } from "./glossary";

describe("applyGlossary", () => {
  it("swaps a known Spain term for its Latin American equivalent", () => {
    expect(applyGlossary("Corta las patatas en cuartos.", "es-LA")).toBe("Corta las papas en cuartos.");
  });

  it("preserves capitalization of the matched word", () => {
    expect(applyGlossary("Patatas fritas", "es-LA")).toBe("Papas fritas");
  });

  it("only replaces whole words, not substrings", () => {
    // "patatas" appears inside a longer, unrelated word — must not match.
    expect(applyGlossary("xpatatasx", "es-LA")).toBe("xpatatasx");
  });

  it("applies multi-word phrase entries", () => {
    expect(applyGlossary("Añade las judías verdes.", "es-LA")).toBe("Añade las ejotes.");
  });

  it("returns the text unchanged for an unknown glossary name", () => {
    expect(applyGlossary("patatas", "not-a-real-glossary")).toBe("patatas");
  });

  it("returns empty/falsy text unchanged", () => {
    expect(applyGlossary("", "es-LA")).toBe("");
  });
});
