import { describe, expect, it } from "vitest";
import { formatDuration, parseMinutesText } from "./duration";

describe("formatDuration", () => {
  it("formats seconds under a minute", () => {
    expect(formatDuration(45)).toBe("0:45");
  });

  it("formats minutes and seconds without a leading zero on minutes", () => {
    expect(formatDuration(3 * 60 + 5)).toBe("3:05");
  });

  it("formats an hour or more with a padded minutes segment", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("clamps negative input to zero", () => {
    expect(formatDuration(-5)).toBe("0:00");
  });
});

describe("parseMinutesText", () => {
  it("parses a plain number", () => {
    expect(parseMinutesText("10")).toBe(10);
  });

  it("takes the first number out of a range", () => {
    expect(parseMinutesText("10-12 min")).toBe(10);
  });

  it("parses a decimal", () => {
    expect(parseMinutesText("2.5 min")).toBe(2.5);
  });

  it("returns null when there's no number", () => {
    expect(parseMinutesText("a while")).toBeNull();
    expect(parseMinutesText("")).toBeNull();
  });
});
