import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { isAnalysisPending, isAnalysisReady } from "@/lib/analysis-utils";
import { db } from "@/lib/db";
import { paperAnalyses, papers } from "@/lib/db/schema";
import { runBackground, shouldUseQueue } from "@/lib/jobs/run-background";
import { analyzePaper, isAnalyzeInFlight, isAnalysisStale } from "@/lib/services/paper-analysis";
import { enqueueAnalysis } from "@/lib/workers/paper-queue";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const force = request.nextUrl.searchParams.get("force") === "true";

  const [paper] = await db.select().from(papers).where(eq(papers.id, id)).limit(1);
  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  const [existing] = await db
    .select()
    .from(paperAnalyses)
    .where(eq(paperAnalyses.paperId, id))
    .limit(1);

  if (!force && existing && isAnalysisReady(existing)) {
    return NextResponse.json({ paperId: id, status: "complete" });
  }

  if (!force && existing && isAnalysisPending(existing)) {
    const stale = isAnalysisStale(existing.updatedAt);
    if (isAnalyzeInFlight(id) && !stale) {
      return NextResponse.json({ paperId: id, status: "processing" });
    }
    if (!stale) {
      return NextResponse.json({ paperId: id, status: existing.status });
    }
    // Stale processing row — fall through and restart.
  }

  try {
    if (shouldUseQueue()) {
      await enqueueAnalysis(id);
      return NextResponse.json({ paperId: id, status: "queued" });
    }

    await runBackground(() => analyzePaper(id, { force }));
    return NextResponse.json({ paperId: id, status: "processing" });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
