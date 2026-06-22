import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { isAnalysisReady } from "@/lib/analysis-utils";
import { db } from "@/lib/db";
import { evidenceScores, paperAnalyses, papers } from "@/lib/db/schema";
import { toPaperDetail } from "@/lib/services/paper-mapper";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [paper] = await db.select().from(papers).where(eq(papers.id, id)).limit(1);
  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  let [analysis] = await db
    .select()
    .from(paperAnalyses)
    .where(eq(paperAnalyses.paperId, id))
    .limit(1);

  if (analysis && isAnalysisReady(analysis) && analysis.status !== "complete") {
    await db
      .update(paperAnalyses)
      .set({ status: "complete" })
      .where(eq(paperAnalyses.paperId, id));
    analysis = { ...analysis, status: "complete" };
  }

  const [score] = await db
    .select({ score: evidenceScores.score })
    .from(evidenceScores)
    .where(eq(evidenceScores.paperId, id))
    .limit(1);

  return NextResponse.json(toPaperDetail(paper, analysis, score?.score ?? null));
}
