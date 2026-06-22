import { describe, expect, it } from "vitest";

import {
  NEGATIVE_EFFECT,
  POSITIVE_EFFECT,
  rankPapers,
  verdictFromRanked,
  type RankedPaper,
} from "@/lib/search/evidence-rank";
import type { PaperSummary } from "@/types/paper";

/**
 * Build a fully-populated PaperSummary. Every required field is filled so the
 * fixtures are valid against the real type; callers override only what a given
 * assertion cares about. `evidenceTier` is optional on the type, so it is left
 * out by default.
 */
function makePaper(overrides: Partial<PaperSummary> = {}): PaperSummary {
  return {
    id: "p",
    title: "Untitled study",
    abstract: null,
    doi: null,
    pubmedId: null,
    publicationDate: "2020-01-01T00:00:00.000Z",
    journal: null,
    authors: null,
    evidenceScore: null,
    source: "pubmed",
    ...overrides,
  };
}

/** Look up a ranked entry by the underlying paper id. */
function byId(ranked: RankedPaper[], id: string): RankedPaper {
  const found = ranked.find((r) => r.paper.id === id);
  if (!found) throw new Error(`no ranked paper with id ${id}`);
  return found;
}

describe("exported effect regexes", () => {
  it("POSITIVE_EFFECT matches clear positive wording", () => {
    expect(POSITIVE_EFFECT.test("the drug was effective")).toBe(true);
    expect(POSITIVE_EFFECT.test("showed significant improvement")).toBe(true);
    expect(POSITIVE_EFFECT.test("a neutral descriptive paragraph")).toBe(false);
  });

  it("NEGATIVE_EFFECT matches clear negative wording", () => {
    expect(NEGATIVE_EFFECT.test("found no significant benefit")).toBe(true);
    expect(NEGATIVE_EFFECT.test("treatment was ineffective")).toBe(true);
    expect(NEGATIVE_EFFECT.test("the drug was effective")).toBe(false);
  });
});

describe("rankPapers — design hierarchy", () => {
  it("ranks a meta-analysis above a case report for the same query", () => {
    const meta = makePaper({
      id: "meta",
      title: "Statins and cardiovascular outcomes: a meta-analysis",
      abstract:
        "This meta-analysis pooled data from many trials (n=12000) on statins.",
    });
    const caseReport = makePaper({
      id: "case",
      title: "Statins: a case report",
      abstract: "We describe a single case report of a patient taking statins.",
    });

    const ranked = rankPapers("statins cardiovascular", [caseReport, meta]);

    // Strongest evidence first regardless of input order.
    expect(ranked[0].paper.id).toBe("meta");
    expect(ranked[0].designLabel).toBe("Meta-analysis");
    expect(ranked[ranked.length - 1].designLabel).toBe("Case report");

    const metaRanked = byId(ranked, "meta");
    const caseRanked = byId(ranked, "case");
    expect(metaRanked.rer).toBeGreaterThan(caseRanked.rer);
    // Design weights are the exact tier constants emitted by the algorithm.
    expect(metaRanked.designWeight).toBe(0.98);
    expect(caseRanked.designWeight).toBe(0.22);
  });

  it("classifies a randomized controlled trial as the trial tier", () => {
    const rct = makePaper({
      id: "rct",
      title: "Effect of drug X: a randomized controlled trial",
      abstract:
        "In this double-blind, placebo-controlled randomized controlled trial, drug X was effective.",
    });

    const [first] = rankPapers("drug", [rct]);
    expect(first.designLabel).toBe("Randomized trial");
    expect(first.designWeight).toBe(0.86);
  });

  it("returns the largest plausible sample size mentioned (n=...)", () => {
    const paper = makePaper({
      id: "big",
      title: "Cohort study of outcomes",
      abstract: "A prospective cohort study followed n=8000 participants.",
    });
    const [first] = rankPapers("outcomes", [paper]);
    expect(first.sampleSize).toBe(8000);
    expect(first.designLabel).toBe("Cohort");
  });
});

describe("rankPapers — query relevance", () => {
  it("ranks the on-topic paper above an off-topic one of the same design", () => {
    // Same design (both meta-analyses), same year, same journal, same sample,
    // same effect wording — so the only differentiator is query relevance.
    const onTopic = makePaper({
      id: "on",
      title: "Migraine prophylaxis: a meta-analysis",
      abstract:
        "A meta-analysis (n=5000) found migraine prophylaxis to be effective.",
      publicationDate: "2022-01-01T00:00:00.000Z",
      journal: "Lancet",
    });
    const offTopic = makePaper({
      id: "off",
      title: "Sunburn treatment: a meta-analysis",
      abstract:
        "A meta-analysis (n=5000) found sunburn treatment to be effective.",
      publicationDate: "2022-01-01T00:00:00.000Z",
      journal: "Lancet",
    });

    const ranked = rankPapers("migraine prophylaxis", [offTopic, onTopic]);
    expect(ranked[0].paper.id).toBe("on");
    expect(byId(ranked, "on").rer).toBeGreaterThan(byId(ranked, "off").rer);
  });
});

describe("rankPapers — reason string", () => {
  it("starts with the design label and includes sample size and year", () => {
    const paper = makePaper({
      id: "r",
      title: "Hypertension control: a meta-analysis",
      abstract: "A meta-analysis of n=12000 patients on hypertension control.",
      publicationDate: "2021-06-01T00:00:00.000Z",
    });
    const [first] = rankPapers("hypertension", [paper]);

    expect(first.reason.startsWith("Meta-analysis")).toBe(true);
    // Sample size is rendered with en-US grouping and a ≈ prefix.
    expect(first.reason).toContain("n≈12,000");
    expect(first.reason).toContain("2021");
    // Parts are joined with " · ".
    expect(first.reason).toBe("Meta-analysis · n≈12,000 · 2021");
  });
});

describe("rankPapers — edge cases", () => {
  it("returns an empty array for empty input", () => {
    expect(rankPapers("", [])).toEqual([]);
    expect(rankPapers("anything", [])).toEqual([]);
  });

  it("produces RER in the 0..100 range sorted descending", () => {
    const papers = [
      makePaper({
        id: "a",
        title: "Topic A meta-analysis",
        abstract: "A meta-analysis (n=9000) showed it was effective.",
      }),
      makePaper({
        id: "b",
        title: "Topic A case report",
        abstract: "A single case report.",
      }),
    ];
    const ranked = rankPapers("topic", papers);
    for (const r of ranked) {
      expect(r.rer).toBeGreaterThanOrEqual(0);
      expect(r.rer).toBeLessThanOrEqual(100);
      expect(Number.isInteger(r.rer)).toBe(true);
    }
    expect(ranked[0].rer).toBeGreaterThanOrEqual(ranked[1].rer);
  });
});

describe("verdictFromRanked", () => {
  it("returns 'insufficient' for an empty ranking", () => {
    const v = verdictFromRanked([]);
    expect(v.verdict).toBe("insufficient");
    expect(v.confidence).toBe("low");
    expect(v.positiveMass).toBe(0);
    expect(v.negativeMass).toBe(0);
  });

  it("returns 'insufficient' for a single study even when positive", () => {
    const single = rankPapers("statins", [
      makePaper({
        id: "solo",
        title: "Statins: a meta-analysis",
        abstract: "A meta-analysis (n=12000) found statins effective.",
      }),
    ]);
    expect(single).toHaveLength(1);
    expect(single[0].direction).toBe(1);
    expect(verdictFromRanked(single).verdict).toBe("insufficient");
  });

  it("returns 'supports' when multiple strong studies all point positive", () => {
    const ranked = rankPapers("statins cardiovascular", [
      makePaper({
        id: "m1",
        title: "Statins reduce risk: a meta-analysis",
        abstract:
          "A meta-analysis (n=20000) found statins effective at reducing mortality.",
        journal: "Lancet",
      }),
      makePaper({
        id: "t1",
        title: "Statins: a randomized controlled trial",
        abstract:
          "A double-blind placebo-controlled randomized controlled trial (n=8000) where statins were effective.",
        journal: "NEJM",
      }),
    ]);

    expect(ranked.every((r) => r.direction === 1)).toBe(true);
    const v = verdictFromRanked(ranked);
    expect(v.verdict).toBe("supports");
    expect(v.positiveMass).toBeGreaterThan(0);
    expect(v.negativeMass).toBe(0);
  });

  it("returns a conflicting verdict when strong studies disagree", () => {
    const ranked = rankPapers("treatment outcome", [
      makePaper({
        id: "pos",
        title: "Treatment outcome: a meta-analysis",
        abstract:
          "A meta-analysis (n=20000) found the treatment effective at reducing mortality.",
        journal: "Lancet",
      }),
      makePaper({
        id: "neg",
        title: "Treatment outcome: a meta-analysis of harms",
        abstract:
          "A meta-analysis (n=20000) found no significant effect and an increased risk of harm.",
        journal: "NEJM",
      }),
    ]);

    const pos = byId(ranked, "pos");
    const neg = byId(ranked, "neg");
    expect(pos.direction).toBe(1);
    expect(neg.direction).toBe(-1);

    const v = verdictFromRanked(ranked);
    // Two evenly-matched opposing meta-analyses → the algorithm's vote is
    // balanced, yielding "mixed" (share near 0.5).
    expect(["mixed", "contradictory"]).toContain(v.verdict);
    expect(v.positiveMass).toBeGreaterThan(0);
    expect(v.negativeMass).toBeGreaterThan(0);
  });
});
