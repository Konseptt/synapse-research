import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { papers } from "@/lib/db/schema";
import { config } from "@/lib/config";
import { runBackground, shouldUseQueue } from "@/lib/jobs/run-background";
import { requireAuth, validatePdfUpload } from "@/lib/security/auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { processUploadedPdf } from "@/lib/services/paper-analysis";
import { enqueuePdfProcessing } from "@/lib/workers/paper-queue";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const ip = getClientIp(request);
  const { allowed } = rateLimit(`upload:${ip}`, Math.floor(config.rateLimitPerMinute / 2));
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const validation = validatePdfUpload(file);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const title = file.name.replace(/\.pdf$/i, "") || "Uploaded Paper";

  const [inserted] = await db
    .insert(papers)
    .values({ title, source: "upload", fullText: null })
    .returning({ id: papers.id });

  const processJob = () => processUploadedPdf(inserted.id, buffer);

  if (shouldUseQueue()) {
    try {
      await enqueuePdfProcessing(inserted.id, buffer);
    } catch {
      await runBackground(processJob);
    }
  } else {
    await runBackground(processJob);
  }

  return NextResponse.json({ id: inserted.id, title, status: "processing" });
}
