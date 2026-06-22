import { eq } from "drizzle-orm";

import { summarizePaper } from "@/lib/ai/chains/summarize-paper";
import { isAnalysisReady } from "@/lib/analysis-utils";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { evidenceScores, paperAnalyses, papers } from "@/lib/db/schema";
import { scoreEvidence } from "@/lib/services/evidence-scoring";
import { indexPaperChunks } from "@/lib/services/rag";

const inflight = new Map<string, Promise<void>>();

export function isAnalyzeInFlight(paperId: string): boolean {
  return inflight.has(paperId);
}

export function isAnalysisStale(updatedAt: Date | null | undefined): boolean {
  if (!updatedAt) return true;
  return Date.now() - updatedAt.getTime() > config.analysisStaleMs;
}

export async function analyzePaper(
  paperId: string,
  options?: { force?: boolean },
): Promise<void> {
  const running = inflight.get(paperId);
  if (running) return running;

  const promise = runAnalysis(paperId, options).finally(() => {
    inflight.delete(paperId);
  });
  inflight.set(paperId, promise);
  return promise;
}

async function runAnalysis(paperId: string, options?: { force?: boolean }): Promise<void> {
  const [existing] = await db
    .select()
    .from(paperAnalyses)
    .where(eq(paperAnalyses.paperId, paperId))
    .limit(1);

  if (!options?.force && existing && isAnalysisReady(existing)) {
    return;
  }

  const [paper] = await db.select().from(papers).where(eq(papers.id, paperId)).limit(1);
  if (!paper) throw new Error("Paper not found");

  const now = new Date();

  await db
    .insert(paperAnalyses)
    .values({ paperId, status: "processing", updatedAt: now })
    .onConflictDoUpdate({
      target: paperAnalyses.paperId,
      set: { status: "processing", updatedAt: now },
    });

  const text = paper.fullText ?? paper.abstract ?? "";
  if (!text.trim()) {
    await db
      .update(paperAnalyses)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(paperAnalyses.paperId, paperId));
    throw new Error("Paper has no abstract or full text to analyze");
  }

  try {
    const indexText = paper.fullText ?? paper.abstract ?? "";
    if (indexText.trim()) {
      await indexPaperChunks(paperId, indexText);
    }
  } catch (error) {
    console.error("Chunk indexing failed:", error);
    // Continue — chat can still fall back to abstract
  }

  let summary;
  try {
    summary = await summarizePaper(text);
  } catch (error) {
    console.error("Summarize failed:", error);
    await db
      .update(paperAnalyses)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(paperAnalyses.paperId, paperId));
    throw error;
  }

  const findings = summary.findings ?? [];
  const limitations = summary.limitations?.join("; ") ?? null;
  const completedAt = new Date();

  await db
    .insert(paperAnalyses)
    .values({
      paperId,
      researchQuestion: summary.research_question,
      methodology: summary.methodology,
      sampleSize: summary.sample_size,
      population: summary.participants,
      results: findings.join("; ") || null,
      limitations,
      confidenceScore: summary.confidence,
      findings,
      plainSummary: summary.plain_summary,
      conflictOfInterest: summary.conflict_of_interest,
      funding: summary.funding,
      status: "complete",
      updatedAt: completedAt,
    })
    .onConflictDoUpdate({
      target: paperAnalyses.paperId,
      set: {
        researchQuestion: summary.research_question,
        methodology: summary.methodology,
        sampleSize: summary.sample_size,
        population: summary.participants,
        results: findings.join("; ") || null,
        limitations,
        confidenceScore: summary.confidence,
        findings,
        plainSummary: summary.plain_summary,
        conflictOfInterest: summary.conflict_of_interest,
        funding: summary.funding,
        status: "complete",
        updatedAt: completedAt,
      },
    });

  const breakdown = scoreEvidence(
    {
      title: paper.title,
      abstract: paper.abstract,
      publicationDate: paper.publicationDate,
      journal: paper.journal,
    },
    {
      researchQuestion: summary.research_question,
      methodology: summary.methodology,
      sampleSize: summary.sample_size,
      population: summary.participants,
      results: findings.join("; ") || null,
      limitations,
      confidenceScore: summary.confidence,
      findings,
      plainSummary: summary.plain_summary,
      conflictOfInterest: summary.conflict_of_interest,
      funding: summary.funding,
      status: "complete",
    },
  );

  await db
    .insert(evidenceScores)
    .values({
      paperId,
      score: breakdown.score,
      studyTypeScore: breakdown.studyTypeScore,
      sampleSizeScore: breakdown.sampleSizeScore,
      recencyScore: breakdown.recencyScore,
      biasScore: breakdown.biasScore,
      reasoning: breakdown.reasoning,
    })
    .onConflictDoUpdate({
      target: evidenceScores.paperId,
      set: {
        score: breakdown.score,
        studyTypeScore: breakdown.studyTypeScore,
        sampleSizeScore: breakdown.sampleSizeScore,
        recencyScore: breakdown.recencyScore,
        biasScore: breakdown.biasScore,
        reasoning: breakdown.reasoning,
      },
    });
}

export async function processUploadedPdf(paperId: string, buffer: Buffer): Promise<void> {
  try {
    const { extractPdfText } = await import("@/lib/services/pdf");
    const text = await extractPdfText(buffer);

    if (!text.trim()) {
      throw new Error("Could not extract text from PDF");
    }

    await db
      .update(papers)
      .set({ fullText: text, source: "upload" })
      .where(eq(papers.id, paperId));

    await analyzePaper(paperId);
  } catch (error) {
    console.error("PDF processing failed:", error);
    await db
      .insert(paperAnalyses)
      .values({ paperId, status: "failed", updatedAt: new Date() })
      .onConflictDoUpdate({
        target: paperAnalyses.paperId,
        set: { status: "failed", updatedAt: new Date() },
      });
    throw error;
  }
}
