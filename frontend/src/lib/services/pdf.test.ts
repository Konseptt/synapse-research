import { describe, expect, it } from "vitest";

import { chunkText } from "@/lib/services/pdf";

describe("pdf service", () => {
  it("chunks text with overlap", () => {
    const text = "a".repeat(3000);
    const chunks = chunkText(text, 1500, 200);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBe(1500);
  });

  it("returns empty array for empty text", () => {
    expect(chunkText("")).toEqual([]);
  });
});
