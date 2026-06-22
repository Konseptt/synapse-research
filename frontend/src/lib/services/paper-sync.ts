import { inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { evidenceScores, papers } from "@/lib/db/schema";
import type { PubMedPaper } from "@/lib/services/pubmed";
import type { PaperSummary } from "@/types/paper";

function safeDate(date: Date | null): Date | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Persist freshly fetched PubMed papers and return them as summaries with
 * stable DB ids.
 *
 * Only brand-new PMIDs are written. A PubMed record for a given PMID is
 * effectively immutable, so the previous implementation's per-search UPDATE of
 * every existing row was pure churn — it added N write round-trips to the
 * latency-critical search path for data that never changed. We now do at most
 * one SELECT + one INSERT.
 */
export async function upsertPubMedPapers(results: PubMedPaper[]): Promise<PaperSummary[]> {
  if (results.length === 0) return [];

  const pubmedIds = results.map((r) => r.pubmedId).filter(Boolean);
  const existingRows = pubmedIds.length
    ? await db
        .select({ id: papers.id, pubmedId: papers.pubmedId })
        .from(papers)
        .where(inArray(papers.pubmedId, pubmedIds))
    : [];

  const idByPubmed = new Map<string, string>();
  for (const row of existingRows) {
    if (row.pubmedId) idByPubmed.set(row.pubmedId, row.id);
  }

  const toInsert = results
    .filter((r) => r.pubmedId && !idByPubmed.has(r.pubmedId))
    .map((r) => ({
      title: r.title,
      abstract: r.abstract,
      doi: r.doi,
      pubmedId: r.pubmedId,
      authors: r.authors,
      journal: r.journal,
      publicationDate: safeDate(r.publicationDate),
      source: "pubmed",
    }));

  if (toInsert.length > 0) {
    const inserted = await db
      .insert(papers)
      .values(toInsert)
      .onConflictDoNothing({ target: papers.pubmedId })
      .returning({ id: papers.id, pubmedId: papers.pubmedId });
    for (const row of inserted) {
      if (row.pubmedId) idByPubmed.set(row.pubmedId, row.id);
    }

    // A concurrent search may have inserted the same PMID first; onConflict
    // skips it so it is absent from `inserted`. Resolve those stragglers.
    const unresolved = toInsert
      .map((r) => r.pubmedId)
      .filter((pid): pid is string => Boolean(pid) && !idByPubmed.has(pid));
    if (unresolved.length > 0) {
      const rows = await db
        .select({ id: papers.id, pubmedId: papers.pubmedId })
        .from(papers)
        .where(inArray(papers.pubmedId, unresolved));
      for (const row of rows) {
        if (row.pubmedId) idByPubmed.set(row.pubmedId, row.id);
      }
    }
  }

  const paperIds = results
    .map((r) => (r.pubmedId ? idByPubmed.get(r.pubmedId) : undefined))
    .filter((id): id is string => Boolean(id));

  const scoreRows =
    paperIds.length > 0
      ? await db
          .select({ paperId: evidenceScores.paperId, score: evidenceScores.score })
          .from(evidenceScores)
          .where(inArray(evidenceScores.paperId, paperIds))
      : [];
  const scoreByPaper = new Map(scoreRows.map((s) => [s.paperId, s.score]));

  return results
    .map((result): PaperSummary | null => {
      const paperId = result.pubmedId ? idByPubmed.get(result.pubmedId) : undefined;
      if (!paperId) return null;
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
    })
    .filter((p): p is PaperSummary => p !== null);
}
