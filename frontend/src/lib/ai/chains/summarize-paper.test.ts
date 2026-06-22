import { describe, expect, it } from "vitest";

import { summarizePaperSchema } from "@/lib/ai/chains/summarize-paper";

describe("AI JSON validation", () => {
  it("parses valid summarize output", () => {
    const data = {
      title: "Study of depression",
      research_question: "Does tDCS help?",
      methodology: "RCT",
      sample_size: "100",
      participants: "Adults with MDD",
      findings: ["Improvement observed"],
      plain_summary: "A small trial suggested the treatment may help symptoms, but more research is needed.",
      limitations: ["Small sample"],
      conflict_of_interest: "Authors declare no competing interests.",
      funding: "NIH grant R01-12345",
      confidence: 0.7,
    };

    const parsed = summarizePaperSchema.parse(data);
    expect(parsed.research_question).toBe("Does tDCS help?");
    expect(parsed.findings).toHaveLength(1);
    expect(parsed.conflict_of_interest).toContain("no competing");
    expect(parsed.funding).toContain("NIH");
  });

  it("accepts null fields", () => {
    const parsed = summarizePaperSchema.parse({
      title: null,
      research_question: null,
      methodology: null,
      sample_size: null,
      participants: null,
      findings: null,
      plain_summary: null,
      limitations: null,
      conflict_of_interest: null,
      funding: null,
      confidence: null,
    });
    expect(parsed.title).toBeNull();
  });

  it("rejects invalid types", () => {
    expect(() =>
      summarizePaperSchema.parse({
        title: 123,
        research_question: null,
        methodology: null,
        sample_size: null,
        participants: null,
        findings: null,
        plain_summary: null,
        limitations: null,
        conflict_of_interest: null,
        funding: null,
        confidence: null,
      }),
    ).toThrow();
  });
});
