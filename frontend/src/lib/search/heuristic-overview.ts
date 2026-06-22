/**
 * Extractive Consensus Synthesis (ECS) — sub-millisecond overview from abstracts.
 * No GPU/API: ranks sentences, detects efficacy signals, cites [1]…[n].
 */

import { decodeHtmlEntities } from "@/lib/analysis-utils";
import type { PaperSummary, SearchOverviewResponse } from "@/types/paper";

const POSITIVE = /\b(effective|efficacy|benefit|improve|reduce[ds]? risk|protect|prevent|successful|significant|positive|safe|recommended)\b/i;
const NEGATIVE = /\b(ineffective|no effect|no significant|harm|adverse|risk increase|worse|failed|contradict|not recommend)\b/i;
const MIXED = /\b(mixed|variable|inconclusive|limited|uncertain|moderate|some evidence)\b/i;

function clean(text: string): string {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

function leadSentence(abstract: string | null, title: string): string {
  const raw = clean(abstract ?? title);
  const match = raw.match(/^(.{40,220}?[.!?])(\s|$)/);
  if (match) return match[1].trim();
  return raw.slice(0, 180).trim() + (raw.length > 180 ? "…" : "");
}

function scoreAbstract(text: string): number {
  const t = text.toLowerCase();
  let s = 0;
  if (POSITIVE.test(t)) s += 1;
  if (NEGATIVE.test(t)) s -= 1;
  if (MIXED.test(t)) s += 0;
  return s;
}

function verdictFromScores(scores: number[], count: number): SearchOverviewResponse["verdict"] {
  if (count === 0) return "insufficient";
  if (count === 1) return "insufficient";
  const pos = scores.filter((s) => s > 0).length;
  const neg = scores.filter((s) => s < 0).length;
  if (pos >= count * 0.6 && neg === 0) return "supports";
  if (neg >= count * 0.5) return "contradictory";
  if (pos > 0 && neg > 0) return "mixed";
  if (pos > 0 || neg > 0) return "mixed";
  return "insufficient";
}

function verdictLabel(v: SearchOverviewResponse["verdict"]): string {
  switch (v) {
    case "supports":
      return "Trend: supportive";
    case "mixed":
      return "Trend: mixed";
    case "contradictory":
      return "Trend: skeptical";
    default:
      return "Early read";
  }
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

  const scores = top.map((p) => scoreAbstract(clean(p.abstract ?? p.title)));
  const verdict = verdictFromScores(scores, count);

  const cited = top.slice(0, Math.min(3, count)).map((p, i) => {
    const lead = leadSentence(p.abstract, p.title);
    return `[${i + 1}] ${lead}`;
  });

  let consensus: string;
  if (verdict === "supports") {
    consensus = "Several abstracts point toward benefit, though study designs vary.";
  } else if (verdict === "contradictory") {
    consensus = "Several abstracts raise doubts or report limited benefit.";
  } else if (verdict === "mixed") {
    consensus = "Findings are not fully aligned across these studies.";
  } else {
    consensus = "More detail is in each study; consider reading abstracts below.";
  }

  const summary =
    count === 1
      ? `One study matches your question. ${cited[0]} Select it in the list for the full abstract.`
      : `${cited.join(" ")} Across ${count} studies, ${consensus}`;

  return {
    query,
    summary,
    verdict,
    verdictLabel: verdictLabel(verdict),
    sources: top.map((paper, i) => ({
      index: i + 1,
      paperId: paper.id,
      title: paper.title,
      journal: paper.journal,
      year: paper.publicationDate?.slice(0, 4) ?? null,
      pubmedId: paper.pubmedId,
      excerpt: leadSentence(paper.abstract, paper.title).slice(0, 140),
    })),
    uncertainty: null,
    disclaimer: "This is research synthesis, not medical advice.",
    generatedBy: "heuristic",
  };
}
