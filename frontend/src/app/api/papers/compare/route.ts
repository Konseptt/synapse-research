import { eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { evidenceScores, paperAnalyses, papers } from "@/lib/db/schema";
import { toPaperDetail } from "@/lib/services/paper-mapper";

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids query param required" }, { status: 400 });
  }

  const paperRows = await db.select().from(papers).where(inArray(papers.id, ids));
  if (paperRows.length === 0) {
    return NextResponse.json({ error: "No papers found" }, { status: 404 });
  }

  const analyses = await db
    .select()
    .from(paperAnalyses)
    .where(inArray(paperAnalyses.paperId, ids));

  const scores = await db
    .select({ paperId: evidenceScores.paperId, score: evidenceScores.score })
    .from(evidenceScores)
    .where(inArray(evidenceScores.paperId, ids));

  const scoreMap = new Map(scores.map((s) => [s.paperId, s.score]));
  const analysisMap = new Map(analyses.map((a) => [a.paperId, a]));

  const ordered = ids
    .map((id) => paperRows.find((p) => p.id === id))
    .filter(Boolean)
    .map((paper) =>
      toPaperDetail(paper!, analysisMap.get(paper!.id), scoreMap.get(paper!.id) ?? null),
    );

  return NextResponse.json({ papers: ordered });
}
