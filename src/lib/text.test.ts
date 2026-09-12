import { describe, expect, it } from "vitest";
import { capitalizeSentences, titleCase } from "./text";

describe("titleCase", () => {
  it("capitalizes each word", () => {
    expect(titleCase("orange zest")).toBe("Orange Zest");
    expect(titleCase("fresh basil, chiffonade")).toBe("Fresh Basil, Chiffonade");
  });

  it("preserves existing acronyms", () => {
    expect(titleCase("bbq sauce")).toBe("Bbq Sauce");
    expect(titleCase("BBQ sauce")).toBe("BBQ Sauce");
    expect(titleCase("USDA grade a")).toBe("USDA Grade A");
  });

  it("preserves internal whitespace", () => {
    expect(titleCase("olive  oil")).toBe("Olive  Oil");
  });

  it("handles empty and single-character input", () => {
    expect(titleCase("")).toBe("");
    expect(titleCase("a")).toBe("A");
  });

  it("lowercases the remainder of mixed-case words", () => {
    expect(titleCase("oLIVE oil")).toBe("Olive Oil");
  });
});

describe("capitalizeSentences", () => {
  it("capitalizes the first letter of the string", () => {
    expect(capitalizeSentences("preheat the oven.")).toBe("Preheat the oven.");
  });

  it("capitalizes after sentence-ending punctuation", () => {
    expect(capitalizeSentences("mix well. bake for 20 minutes! let cool. is it done?")).toBe(
      "Mix well. Bake for 20 minutes! Let cool. Is it done?"
    );
  });

  it("capitalizes after newlines", () => {
    expect(capitalizeSentences("step one.\nstep two.")).toBe("Step one.\nStep two.");
  });

  it("leaves the rest of each sentence untouched", () => {
    expect(capitalizeSentences("room temperature, not cold.")).toBe(
      "Room temperature, not cold."
    );
  });

  it("does not require multiple spaces after punctuation", () => {
    expect(capitalizeSentences("done. next step.")).toBe("Done. Next step.");
  });

  it("handles null/undefined/empty input", () => {
    expect(capitalizeSentences(null)).toBe("");
    expect(capitalizeSentences(undefined)).toBe("");
    expect(capitalizeSentences("")).toBe("");
  });

  it("leaves already-capitalized text unchanged", () => {
    expect(capitalizeSentences("Preheat the oven. Then wait.")).toBe(
      "Preheat the oven. Then wait."
    );
  });
});
