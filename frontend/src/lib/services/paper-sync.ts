import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { evidenceScores, papers } from "@/lib/db/schema";
import type { PubMedPaper } from "@/lib/services/pubmed";
import type { PaperSummary } from "@/types/paper";

function safeDate(date: Date | null): Date | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

export async function upsertPubMedPapers(results: PubMedPaper[]): Promise<PaperSummary[]> {
  if (results.length === 0) return [];

  const pubmedIds = results.map((r) => r.pubmedId).filter(Boolean);
  const existingRows = pubmedIds.length
    ? await db.select().from(papers).where(inArray(papers.pubmedId, pubmedIds))
    : [];
  const byPubmed = new Map(existingRows.map((r) => [r.pubmedId, r]));

  const toInsert: (typeof papers.$inferInsert)[] = [];
  const updateOps: Promise<unknown>[] = [];
  const idByPubmed = new Map<string, string>();

  for (const result of results) {
    const pubDate = safeDate(result.publicationDate);
    const existing = byPubmed.get(result.pubmedId);

    if (existing) {
      idByPubmed.set(result.pubmedId, existing.id);
      updateOps.push(
        db
          .update(papers)
          .set({
            title: result.title,
            abstract: result.abstract,
            doi: result.doi,
            authors: result.authors,
            journal: result.journal,
            publicationDate: pubDate,
          })
          .where(eq(papers.id, existing.id)),
      );
    } else {
      toInsert.push({
        title: result.title,
        abstract: result.abstract,
        doi: result.doi,
        pubmedId: result.pubmedId,
        authors: result.authors,
        journal: result.journal,
        publicationDate: pubDate,
        source: "pubmed",
      });
    }
  }

  if (toInsert.length > 0) {
    const inserted = await db
      .insert(papers)
      .values(toInsert)
      .returning({ id: papers.id, pubmedId: papers.pubmedId });
    for (const row of inserted) {
      if (row.pubmedId) idByPubmed.set(row.pubmedId, row.id);
    }
  }

  if (updateOps.length > 0) {
    await Promise.all(updateOps);
  }

  const paperIds = results
    .map((r) => idByPubmed.get(r.pubmedId))
    .filter((id): id is string => Boolean(id));

  const scoreRows =
    paperIds.length > 0
      ? await db
          .select({ paperId: evidenceScores.paperId, score: evidenceScores.score })
          .from(evidenceScores)
          .where(inArray(evidenceScores.paperId, paperIds))
      : [];
  const scoreByPaper = new Map(scoreRows.map((s) => [s.paperId, s.score]));

  return results.map((result) => {
    const paperId = idByPubmed.get(result.pubmedId)!;
    const pubDate = safeDate(result.publicationDate);
    return {
      id: paperId,
      title: result.title,
      abstract: result.abstract,
      doi: result.doi,
      pubmedId: result.pubmedId,
      publicationDate: pubDate?.toISOString() ?? null,
      journal: result.journal,
      authors: result.authors,
      evidenceScore: scoreByPaper.get(paperId) ?? null,
      source: "pubmed",
    };
  });
}
