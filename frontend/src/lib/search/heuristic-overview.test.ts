import { describe, expect, it } from "vitest";

import { buildHeuristicOverview } from "@/lib/search/heuristic-overview";
import type { PaperSummary } from "@/types/paper";

const papers: PaperSummary[] = [
  {
    id: "a",
    title: "Flu vaccine meta-analysis",
    abstract:
      "This systematic review found influenza vaccines are effective at reducing hospitalization in older adults.",
    doi: null,
    pubmedId: "1",
    publicationDate: "2024-01-01T00:00:00.000Z",
    journal: "Lancet",
    authors: null,
    evidenceScore: null,
    source: "pubmed",
  },
  {
    id: "b",
    title: "mRNA flu vaccine trial",
    abstract:
      "A bivalent mRNA vaccine showed significant protection against homologous strains in a phase 2 trial.",
    doi: null,
    pubmedId: "2",
    publicationDate: "2023-06-01T00:00:00.000Z",
    journal: "NEJM",
    authors: null,
    evidenceScore: null,
    source: "pubmed",
  },
];

describe("buildHeuristicOverview", () => {
  it("synthesizes cited summary instantly", () => {
    const result = buildHeuristicOverview("flu shot", papers);
    expect(result.generatedBy).toBe("heuristic");
    expect(result.summary).toContain("[1]");
    expect(result.summary).toContain("Across 2 studies");
    expect(result.sources).toHaveLength(2);
  });

  it("detects supportive trend from positive abstracts", () => {
    const result = buildHeuristicOverview("flu vaccine", papers);
    expect(result.verdict).toBe("supports");
  });
});
