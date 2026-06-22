import type { PaperSummary, SearchOverviewResponse } from "@/types/paper";

export function buildInstantOverview(
  query: string,
  papers: PaperSummary[],
): SearchOverviewResponse {
  const top = papers.slice(0, 8);
  const count = top.length;

  let summary: string;
  if (count === 0) {
    summary = `No studies matched your question. Try broader terms or remove filters.`;
  } else if (count === 1) {
    summary = `Found 1 study related to your question. Select it in the list to read more.`;
  } else {
    summary = `Found ${count} studies related to your question. Browse the list on the left or read the AI summary when ready.`;
  }

  return {
    query,
    summary,
    verdict: count >= 4 ? "mixed" : "insufficient",
    verdictLabel:
      count === 0 ? "No studies found" : count === 1 ? "1 study" : `${count} studies`,
    sources: top.map((paper, i) => ({
      index: i + 1,
      paperId: paper.id,
      title: paper.title,
      journal: paper.journal,
      year: paper.publicationDate?.slice(0, 4) ?? null,
      pubmedId: paper.pubmedId,
      excerpt: (paper.abstract ?? paper.title).slice(0, 140),
    })),
    uncertainty: null,
    disclaimer: "This is research synthesis, not medical advice.",
    generatedBy: "instant",
  };
}
