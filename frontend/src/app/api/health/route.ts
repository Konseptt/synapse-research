import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { config } from "@/lib/config";
import { db } from "@/lib/db";

export async function GET() {
  const checks: Record<string, string> = { service: "synapse" };

  try {
    await db.execute(sql`SELECT 1`);
    checks.db = "ok";
  } catch {
    return NextResponse.json(
      { status: "degraded", ...checks, db: "error", ai: config.nvidiaApiKey ? "configured" : "missing" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    status: "ok",
    ...checks,
    ai: config.nvidiaApiKey ? "configured" : "missing",
  });
}
