import { describe, expect, it } from "vitest";

import { searchOverviewSchema } from "@/lib/ai/chains/search-overview";

describe("search overview schema", () => {
  it("parses valid overview output", () => {
    const parsed = searchOverviewSchema.parse({
      summary: "Most studies [1][2] suggest benefit, but sample sizes vary.",
      verdict: "mixed",
      verdict_label: "Evidence is mixed",
      uncertainty: "Few long-term trials.",
    });
    expect(parsed.verdict).toBe("mixed");
    expect(parsed.summary).toContain("[1]");
  });

  it("accepts capitalized verdict after coercion", () => {
    const raw = {
      summary: "Studies [1] support benefit.",
      verdict: "Mixed",
      verdict_label: "Evidence is mixed",
      uncertainty: null,
    };
    const verdict =
      typeof raw.verdict === "string" ? raw.verdict.toLowerCase().trim() : raw.verdict;
    const parsed = searchOverviewSchema.parse({ ...raw, verdict });
    expect(parsed.verdict).toBe("mixed");
  });
});
