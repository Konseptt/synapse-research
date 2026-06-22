import { isAnalysisReady } from "@/lib/analysis-utils";
import type { PaperAnalysis, PaperDetail } from "@/types/paper";
import type { paperAnalyses, papers } from "@/lib/db/schema";

type PaperRow = typeof papers.$inferSelect;
type AnalysisRow = typeof paperAnalyses.$inferSelect;

export function mapAnalysis(analysis: AnalysisRow | undefined): PaperAnalysis | null {
  if (!analysis) return null;
  return {
    researchQuestion: analysis.researchQuestion,
    methodology: analysis.methodology,
    sampleSize: analysis.sampleSize,
    population: analysis.population,
    results: analysis.results,
    limitations: analysis.limitations,
    confidenceScore: analysis.confidenceScore,
    findings: analysis.findings,
    plainSummary:
      analysis.plainSummary ??
      (analysis.findings?.length
        ? analysis.findings.slice(0, 2).join(" ")
        : analysis.researchQuestion),
    conflictOfInterest: analysis.conflictOfInterest,
    funding: analysis.funding,
    status: analysis.status,
  };
}

export function toPaperDetail(
  paper: PaperRow,
  analysis: AnalysisRow | undefined,
  evidenceScore: number | null,
): PaperDetail {
  let normalized = analysis;
  if (analysis && isAnalysisReady(analysis) && analysis.status !== "complete") {
    normalized = { ...analysis, status: "complete" };
  }

  return {
    id: paper.id,
    title: paper.title,
    abstract: paper.abstract,
    doi: paper.doi,
    pubmedId: paper.pubmedId,
    publicationDate: paper.publicationDate?.toISOString() ?? null,
    journal: paper.journal,
    authors: paper.authors,
    evidenceScore,
    source: paper.source,
    fullText: paper.fullText,
    createdAt: paper.createdAt?.toISOString() ?? null,
    analysis: mapAnalysis(normalized),
  };
}
