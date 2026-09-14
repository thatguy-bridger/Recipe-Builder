import { describe, expect, it } from "vitest";
import { extractRecipePhotoStoragePath } from "./storagePaths";

describe("extractRecipePhotoStoragePath", () => {
  it("recovers the object path from a public recipe-photos URL", () => {
    const url =
      "https://pfobqnctixdpdzzrtriu.supabase.co/storage/v1/object/public/recipe-photos/a1b2c3.jpg";
    expect(extractRecipePhotoStoragePath(url)).toBe("a1b2c3.jpg");
  });

  it("recovers a nested path (e.g. the curriculum import prefix)", () => {
    const url =
      "https://pfobqnctixdpdzzrtriu.supabase.co/storage/v1/object/public/recipe-photos/curriculum/abc.jpg";
    expect(extractRecipePhotoStoragePath(url)).toBe("curriculum/abc.jpg");
  });

  it("returns null for a URL that isn't in the recipe-photos bucket", () => {
    expect(extractRecipePhotoStoragePath("https://example.com/some-other-image.jpg")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractRecipePhotoStoragePath("")).toBeNull();
  });
});
