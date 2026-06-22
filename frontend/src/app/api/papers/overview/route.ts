import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildSearchOverview } from "@/lib/services/search-overview";
import { config } from "@/lib/config";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 60;

const bodySchema = z.object({
  query: z.string().min(2),
  paperIds: z.array(z.string().min(1)).min(1).max(8),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`overview:${ip}`, Math.min(config.rateLimitPerMinute, 20));
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = bodySchema.parse(await request.json());
    const forceAi = request.nextUrl.searchParams.get("force") === "true";
    const overview = await buildSearchOverview(body.query, body.paperIds, { forceAi });
    return NextResponse.json(overview);
  } catch (error) {
    console.error("Overview error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Overview failed" }, { status: 500 });
  }
}
