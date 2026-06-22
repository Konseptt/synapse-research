import { NextRequest, NextResponse } from "next/server";

import { config } from "@/lib/config";
import { detectConflictsBetweenPapers } from "@/lib/services/conflicts";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`conflicts:${ip}`, Math.floor(config.rateLimitPerMinute / 2));
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = (await request.json()) as { paperIds?: string[] };
  const paperIds = (body.paperIds ?? []).slice(0, 3);

  if (paperIds.length < 2) {
    return NextResponse.json(
      { error: "Select at least two papers to compare for conflicts" },
      { status: 400 },
    );
  }

  try {
    const pairs = await detectConflictsBetweenPapers(paperIds);
    return NextResponse.json({ pairs });
  } catch (error) {
    console.error("Conflict detection error:", error);
    const message = error instanceof Error ? error.message : "Conflict detection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
