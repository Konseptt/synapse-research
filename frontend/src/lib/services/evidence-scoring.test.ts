import { describe, expect, it } from "vitest";

import { scoreEvidence } from "@/lib/services/evidence-scoring";

describe("evidence scoring", () => {
  it("scores RCT with large sample highly", () => {
    const result = scoreEvidence(
      {
        title: "Randomized controlled trial of treatment",
        abstract: "A randomized controlled trial with 1200 participants",
        publicationDate: new Date("2024-01-01"),
        journal: "The Lancet",
      },
      {
        researchQuestion: "Does X work?",
        methodology: "Randomized controlled trial",
        sampleSize: "1200",
        population: "Adults",
        results: "Significant improvement",
        limitations: null,
        confidenceScore: 0.8,
        findings: ["Positive effect"],
        plainSummary: null,
        conflictOfInterest: null,
        funding: null,
        status: "complete",
      },
    );

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.studyTypeScore).toBe(25);
    expect(result.sampleSizeScore).toBe(25);
  });

  it("penalizes small sample and missing controls", () => {
    const result = scoreEvidence(
      {
        title: "Case study",
        abstract: "Small case study with no control group",
        publicationDate: new Date("2010-01-01"),
        journal: null,
      },
      {
        researchQuestion: null,
        methodology: "Case study",
        sampleSize: "12",
        population: null,
        results: null,
        limitations: "No control group",
        confidenceScore: null,
        findings: null,
        plainSummary: null,
        conflictOfInterest: null,
        funding: null,
        status: "complete",
      },
    );

    expect(result.score).toBeLessThan(40);
    expect(result.biasScore).toBeLessThan(0);
  });
});
