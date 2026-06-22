import { eq, inArray } from "drizzle-orm";

import { detectConflicts } from "@/lib/ai/chains/detect-conflicts";
import { isAnalysisReady } from "@/lib/analysis-utils";
import { db } from "@/lib/db";
import { paperAnalyses, papers } from "@/lib/db/schema";
import { seedGraphFromPapers } from "@/lib/services/graph";

export interface ConflictPairResult {
  paperAId: string;
  paperBId: string;
  paperATitle: string;
  paperBTitle: string;
  agreement: boolean;
  reason: string;
}

function summaryForAnalysis(
  title: string,
  analysis: typeof paperAnalyses.$inferSelect,
): string {
  const parts = [
    `Title: ${title}`,
    analysis.plainSummary && `Summary: ${analysis.plainSummary}`,
    analysis.findings?.length && `Findings: ${analysis.findings.join("; ")}`,
    analysis.results && `Results: ${analysis.results}`,
  ].filter(Boolean);
  return parts.join("\n");
}

export async function detectConflictsBetweenPapers(
  paperIds: string[],
): Promise<ConflictPairResult[]> {
  if (paperIds.length < 2) return [];

  const rows = await db
    .select({
      id: papers.id,
      title: papers.title,
      analysis: paperAnalyses,
    })
    .from(papers)
    .leftJoin(paperAnalyses, eq(paperAnalyses.paperId, papers.id))
    .where(inArray(papers.id, paperIds));

  const ready = rows.filter((r) => r.analysis && isAnalysisReady(r.analysis));
  if (ready.length < 2) {
    throw new Error("At least two analyzed papers are required for conflict detection");
  }

  const results: ConflictPairResult[] = [];

  for (let i = 0; i < ready.length; i++) {
    for (let j = i + 1; j < ready.length; j++) {
      const a = ready[i];
      const b = ready[j];
      const summaryA = summaryForAnalysis(a.title, a.analysis!);
      const summaryB = summaryForAnalysis(b.title, b.analysis!);

      const conflict = await detectConflicts(summaryA, summaryB);

      if (!conflict.agreement) {
        await seedGraphFromPapers(a.id, b.id, "CONTRADICTS");
      } else {
        await seedGraphFromPapers(a.id, b.id, "SUPPORTS");
      }

      results.push({
        paperAId: a.id,
        paperBId: b.id,
        paperATitle: a.title,
        paperBTitle: b.title,
        agreement: conflict.agreement,
        reason: conflict.reason,
      });
    }
  }

  return results;
}
