import { describe, expect, it } from "vitest";

import { buildInstantOverview } from "@/lib/search/instant-overview";
import type { PaperSummary } from "@/types/paper";

const samplePapers: PaperSummary[] = [
  {
    id: "a",
    title: "Coffee and health",
    abstract: "This review examines coffee consumption and cardiovascular outcomes.",
    doi: null,
    pubmedId: "123",
    publicationDate: "2024-01-01T00:00:00.000Z",
    journal: "Nutrition Journal",
    authors: null,
    evidenceScore: null,
    source: "pubmed",
  },
  {
    id: "b",
    title: "Caffeine metabolism",
    abstract: "We studied caffeine metabolism in adults.",
    doi: null,
    pubmedId: "456",
    publicationDate: "2023-06-01T00:00:00.000Z",
    journal: "Clinical Science",
    authors: null,
    evidenceScore: null,
    source: "pubmed",
  },
];

describe("buildInstantOverview", () => {
  it("builds a summary from abstracts immediately", () => {
    const result = buildInstantOverview("coffee", samplePapers);
    expect(result.summary).toContain("Found 2 studies");
    expect(result.sources).toHaveLength(2);
  });

  it("handles empty results", () => {
    const result = buildInstantOverview("nothing", []);
    expect(result.verdict).toBe("insufficient");
    expect(result.sources).toHaveLength(0);
  });
});
