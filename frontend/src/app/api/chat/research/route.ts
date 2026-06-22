import { NextRequest, NextResponse } from "next/server";

import { config } from "@/lib/config";
import { researchChat } from "@/lib/services/rag";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`chat:${ip}`, config.rateLimitPerMinute);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = (await request.json()) as { query?: string; paperIds?: string[] };
  const query = body.query?.trim();
  const paperIds = body.paperIds ?? [];

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  try {
    const response = await researchChat(query, paperIds);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Research chat error:", error);
    const message =
      error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
