import { describe, expect, it } from "vitest";
import { buildThemeStyle, isFontPreset, isRadiusPreset } from "./designLanguage";

describe("isRadiusPreset / isFontPreset", () => {
  it("accepts known presets", () => {
    expect(isRadiusPreset("sharp")).toBe(true);
    expect(isFontPreset("playful")).toBe(true);
  });

  it("rejects unknown or null values", () => {
    expect(isRadiusPreset("chunky")).toBe(false);
    expect(isRadiusPreset(null)).toBe(false);
    expect(isFontPreset(null)).toBe(false);
  });
});

describe("buildThemeStyle", () => {
  it("returns an empty style when there's no profile", () => {
    expect(buildThemeStyle(null)).toEqual({});
    expect(buildThemeStyle(undefined)).toEqual({});
  });

  it("returns an empty style when nothing is set", () => {
    expect(
      buildThemeStyle({ theme_accent: null, theme_radius: null, theme_font: null })
    ).toEqual({});
  });

  it("sets accent, a darkened hover, and a translucent soft variant", () => {
    const style = buildThemeStyle({
      theme_accent: "#3355ff",
      theme_radius: null,
      theme_font: null,
    }) as Record<string, string>;
    expect(style["--accent"]).toBe("#3355ff");
    expect(style["--accent-hover"]).toMatch(/^rgb\(/);
    expect(style["--accent-soft"]).toMatch(/^rgba\(51, 85, 255, 0\.16\)$/);
  });

  it("ignores an invalid accent color", () => {
    const style = buildThemeStyle({
      theme_accent: "not-a-color",
      theme_radius: null,
      theme_font: null,
    });
    expect(style).toEqual({});
  });

  it("maps a known radius preset to its CSS value", () => {
    const style = buildThemeStyle({
      theme_accent: null,
      theme_radius: "round",
      theme_font: null,
    }) as Record<string, string>;
    expect(style["--radius"]).toBe("22px");
  });

  it("maps a known font preset to its CSS stack", () => {
    const style = buildThemeStyle({
      theme_accent: null,
      theme_radius: null,
      theme_font: "modern",
    }) as Record<string, string>;
    expect(style["--font-serif"]).toContain("ui-sans-serif");
  });

  it("ignores an unknown radius or font preset", () => {
    const style = buildThemeStyle({
      theme_accent: null,
      theme_radius: "chunky",
      theme_font: "wacky",
    });
    expect(style).toEqual({});
  });
});
