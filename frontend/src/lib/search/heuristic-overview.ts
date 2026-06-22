/**
 * Instant overview, powered by Research Evidence Rank (RER).
 *
 * Papers are ranked by `rankPapers` (see evidence-rank.ts), the verdict is an
 * evidence-weighted vote of effect directions, and the prose cites the highest-
 * ranked studies first — so the zero-latency answer reflects the strongest
 * evidence, not whatever order PubMed happened to return.
 */

import { decodeHtmlEntities } from "@/lib/analysis-utils";
import {
  rankPapers,
  verdictFromRanked,
  type RankedPaper,
  type RankedVerdict,
} from "@/lib/search/evidence-rank";
import type { PaperSummary, SearchOverviewResponse } from "@/types/paper";

function clean(text: string): string {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

function leadSentence(abstract: string | null, title: string): string {
  const raw = clean(abstract ?? title);
  const match = raw.match(/^(.{40,220}?[.!?])(\s|$)/);
  if (match) return match[1].trim();
  return raw.slice(0, 180).trim() + (raw.length > 180 ? "…" : "");
}

function verdictLabel(verdict: RankedVerdict["verdict"]): string {
  switch (verdict) {
    case "supports":
      return "Leans supportive";
    case "contradictory":
      return "Leans skeptical";
    case "mixed":
      return "Mixed evidence";
    default:
      return "Early read";
  }
}

function consensusText(verdict: RankedVerdict["verdict"]): string {
  switch (verdict) {
    case "supports":
      return "the weight of evidence leans toward benefit";
    case "contradictory":
      return "the stronger studies are skeptical of a benefit";
    case "mixed":
      return "higher-quality studies do not fully agree";
    default:
      return "the evidence here is too thin to draw a conclusion";
  }
}

function describeComposition(ranked: RankedPaper[]): string {
  const top = ranked[0];
  if (!top) return "";
  const article = /^[aeiou]/i.test(top.designLabel) ? "an" : "a";
  const size = top.sampleSize ? ` (n≈${top.sampleSize.toLocaleString("en-US")})` : "";
  return `led by ${article} ${top.designLabel.toLowerCase()}${size}`;
}

function toSources(ranked: RankedPaper[]): SearchOverviewResponse["sources"] {
  return ranked.map((r, i) => ({
    index: i + 1,
    paperId: r.paper.id,
    title: r.paper.title,
    journal: r.paper.journal,
    year: r.year ? String(r.year) : r.paper.publicationDate?.slice(0, 4) ?? null,
    pubmedId: r.paper.pubmedId,
    excerpt: leadSentence(r.paper.abstract, r.paper.title).slice(0, 140),
  }));
}

export function buildHeuristicOverview(
  query: string,
  papers: PaperSummary[],
): SearchOverviewResponse {
  const top = papers.slice(0, 8);
  const count = top.length;

  if (count === 0) {
    return {
      query,
      summary: "No studies matched your question. Try broader terms or remove filters.",
      verdict: "insufficient",
      verdictLabel: "No studies found",
      sources: [],
      uncertainty: null,
      disclaimer: "This is research synthesis, not medical advice.",
      generatedBy: "heuristic",
    };
  }

  const ranked = rankPapers(query, top);
  const { verdict, confidence } = verdictFromRanked(ranked);

  const cited = ranked
    .slice(0, Math.min(3, count))
    .map((r, i) => `[${i + 1}] ${leadSentence(r.paper.abstract, r.paper.title)}`);

  let summary: string;
  if (count === 1) {
    const r = ranked[0];
    const from = r.year ? ` from ${r.year}` : "";
    summary = `${cited[0]} This is a single ${r.designLabel.toLowerCase()}${from}; one study is rarely the last word.`;
  } else {
    const composition = describeComposition(ranked);
    summary = `${cited.join(" ")} Across ${count} studies, ${composition}, ${consensusText(verdict)}. Confidence: ${confidence}.`;
  }

  return {
    query,
    summary,
    verdict,
    verdictLabel: verdictLabel(verdict),
    sources: toSources(ranked),
    uncertainty: null,
    disclaimer: "This is research synthesis, not medical advice.",
    generatedBy: "heuristic",
  };
}
