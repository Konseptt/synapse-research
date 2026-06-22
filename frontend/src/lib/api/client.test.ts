import { describe, expect, it, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("api client", () => {
  it("throws on failed requests", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Not Found",
      json: async () => ({ error: "Paper not found" }),
    });

    const { getPaper } = await import("@/lib/api/client");
    await expect(getPaper("invalid-id")).rejects.toThrow("Paper not found");
  });

  it("returns data on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "123", title: "Test Paper" }),
    });

    const { getPaper } = await import("@/lib/api/client");
    const result = await getPaper("123");
    expect(result.title).toBe("Test Paper");
  });
});
