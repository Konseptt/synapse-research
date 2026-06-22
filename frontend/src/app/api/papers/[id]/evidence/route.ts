import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { evidenceScores } from "@/lib/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [score] = await db
    .select()
    .from(evidenceScores)
    .where(eq(evidenceScores.paperId, id))
    .limit(1);

  if (!score) {
    return NextResponse.json({ error: "Evidence score not found" }, { status: 404 });
  }

  return NextResponse.json({
    score: score.score,
    studyTypeScore: score.studyTypeScore,
    sampleSizeScore: score.sampleSizeScore,
    recencyScore: score.recencyScore,
    biasScore: score.biasScore,
    reasoning: score.reasoning,
  });
}
