import type { PaperAnalysis } from "@/types/paper";

export function isAnalysisReady(analysis: PaperAnalysis | null | undefined): boolean {
  if (!analysis) return false;
  if (analysis.status === "complete") return true;
  return Boolean(
    analysis.plainSummary ||
      analysis.researchQuestion ||
      (analysis.findings && analysis.findings.length > 0),
  );
}

export function isAnalysisPending(analysis: PaperAnalysis | null | undefined): boolean {
  if (!analysis || isAnalysisReady(analysis)) return false;
  return analysis.status === "processing" || analysis.status === "queued";
}

export function decodeHtmlEntities(text: string): string {
  // ⚡ Bolt optimization: Fast path skip to prevent running 6 expensive
  // regex replacements on plain strings without HTML entities.
  if (!text || !text.includes("&")) return text;

  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}
