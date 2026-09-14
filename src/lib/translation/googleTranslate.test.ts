import { afterEach, describe, expect, it, vi } from "vitest";
import { translateBatch } from "./googleTranslate";

function mockResponse(segments: string[]) {
  return {
    ok: true,
    json: async () => [segments.map((s) => [s, "orig", null, null, 3])],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("translateBatch", () => {
  it("returns translations in the same order as the input, via one request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(["uno\n", "dos\n", "tres"]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateBatch(["one", "two", "three"], "es");

    expect(result).toEqual(["uno", "dos", "tres"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes empty strings through untranslated without calling fetch for them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(["uno"]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateBatch(["", "one", ""], "es");

    expect(result).toEqual(["", "uno", ""]);
  });

  it("returns all-empty input unchanged without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateBatch(["", "  "], "es");

    expect(result).toEqual(["", ""]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to per-item requests when the batched response doesn't line up", async () => {
    const fetchMock = vi
      .fn()
      // First call: batched request, but comes back with the wrong count.
      .mockResolvedValueOnce(mockResponse(["uno\n"]))
      // Fallback: one request per line.
      .mockResolvedValueOnce(mockResponse(["uno"]))
      .mockResolvedValueOnce(mockResponse(["dos"]));

    vi.stubGlobal("fetch", fetchMock);

    const result = await translateBatch(["one", "two"], "es");

    expect(result).toEqual(["uno", "dos"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(translateBatch(["one"], "es")).rejects.toThrow();
  });
});
