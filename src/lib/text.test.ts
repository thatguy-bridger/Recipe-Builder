import { describe, expect, it } from "vitest";
import { titleCase } from "./text";

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
