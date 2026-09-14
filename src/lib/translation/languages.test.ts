import { describe, expect, it } from "vitest";
import { findLanguage, findVariant, resolveTarget, SUPPORTED_LANGUAGES } from "./languages";

describe("findLanguage", () => {
  it("finds a supported language by code", () => {
    expect(findLanguage("es")?.label).toBe("Spanish");
  });

  it("returns null for an unsupported or missing code", () => {
    expect(findLanguage("xx")).toBeNull();
    expect(findLanguage(null)).toBeNull();
    expect(findLanguage(undefined)).toBeNull();
  });
});

describe("findVariant", () => {
  it("finds a variant on a language that has one", () => {
    const es = findLanguage("es")!;
    expect(findVariant(es, "es-LA")?.label).toBe("Latin America");
  });

  it("returns null when the variant code doesn't exist on that language", () => {
    const es = findLanguage("es")!;
    expect(findVariant(es, "fr-CA")).toBeNull();
  });

  it("returns null when no variant code is given", () => {
    const es = findLanguage("es")!;
    expect(findVariant(es, null)).toBeNull();
  });
});

describe("resolveTarget", () => {
  it("uses the language's own googleCode when no variant is given", () => {
    expect(resolveTarget("es", null)).toEqual({ googleCode: "es", glossaryName: null });
  });

  it("uses a variant's own googleCode when it has one (native Google model)", () => {
    expect(resolveTarget("fr", "fr-CA")).toEqual({ googleCode: "fr-CA", glossaryName: null });
  });

  it("falls back to the parent googleCode and carries a glossary when the variant has one", () => {
    expect(resolveTarget("es", "es-LA")).toEqual({ googleCode: "es", glossaryName: "es-LA" });
  });

  it("returns null for an unsupported language", () => {
    expect(resolveTarget("xx", null)).toBeNull();
  });

  it("returns null for a variant that doesn't belong to the given language", () => {
    expect(resolveTarget("es", "fr-CA")).toBeNull();
  });

  it("every declared variant googleCode or glossaryName resolves cleanly", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      for (const variant of language.variants ?? []) {
        expect(resolveTarget(language.code, variant.code)).not.toBeNull();
      }
    }
  });
});
