import { eq, inArray } from "drizzle-orm";

import {
  synthesizeSearchOverview,
  type OverviewPaperInput,
} from "@/lib/ai/chains/search-overview";
import { TTL, cacheKey, turboGetAsync, turboSetAsync } from "@/lib/cache/turbo-cache";
import { db } from "@/lib/db";
import { paperAnalyses, papers } from "@/lib/db/schema";
import { buildHeuristicOverview } from "@/lib/search/heuristic-overview";
import { RESEARCH_SUMMARY_DISCLAIMER } from "@/lib/content/public-topics";
import type { PaperSummary, SearchOverviewResponse } from "@/types/paper";

const MAX_SOURCES = 3;
const AI_TIMEOUT_MS = 55_000;

export function overviewCacheKey(query: string, paperIds: string[]): string {
  const sorted = [...paperIds].slice(0, 8).sort();
  return cacheKey(["overview", query.toLowerCase().trim(), ...sorted]);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Overview AI timed out")), ms);
    }),
  ]);
}

export function buildFastOverview(
  query: string,
  paperSummaries: PaperSummary[],
): SearchOverviewResponse {
  return buildHeuristicOverview(query, paperSummaries);
}

/**
 * Single-flight registry: when the server warms an overview and the client
 * requests the same one moments later, both await the same in-progress LLM
 * call instead of firing two.
 */
const inflight = new Map<string, Promise<SearchOverviewResponse>>();

export async function buildSearchOverview(
  query: string,
  paperIds: string[],
  options?: { forceAi?: boolean },
): Promise<SearchOverviewResponse> {
  const ck = overviewCacheKey(query, paperIds);

  if (!options?.forceAi) {
    const cached = await turboGetAsync<SearchOverviewResponse>(ck);
    if (cached?.generatedBy === "ai") return cached;
    const running = inflight.get(ck);
    if (running) return running;
  }

  const job = computeAiOverview(query, paperIds.slice(0, MAX_SOURCES), ck).finally(() => {
    if (inflight.get(ck) === job) inflight.delete(ck);
  });
  inflight.set(ck, job);
  return job;
}

async function computeAiOverview(
  query: string,
  ids: string[],
  ck: string,
): Promise<SearchOverviewResponse> {
  if (ids.length === 0) {
    return buildHeuristicOverview(query, []);
  }

  const rows = await db
    .select({
      id: papers.id,
      title: papers.title,
      abstract: papers.abstract,
      journal: papers.journal,
      publicationDate: papers.publicationDate,
      pubmedId: papers.pubmedId,
      plainSummary: paperAnalyses.plainSummary,
      findings: paperAnalyses.findings,
    })
    .from(papers)
    .leftJoin(paperAnalyses, eq(paperAnalyses.paperId, papers.id))
    .where(inArray(papers.id, ids));

  const ordered = ids
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is (typeof rows)[number] => Boolean(r));

  const paperSummaries: PaperSummary[] = ordered.map((row) => ({
    id: row.id,
    title: row.title,
    abstract: row.abstract,
    doi: null,
    pubmedId: row.pubmedId,
    publicationDate: row.publicationDate?.toISOString?.() ?? null,
    journal: row.journal,
    authors: null,
    evidenceScore: null,
    source: "pubmed",
  }));

  const heuristic = buildHeuristicOverview(query, paperSummaries);

  const inputs: OverviewPaperInput[] = ordered.map((row, i) => ({
    index: i + 1,
    title: row.title,
    abstract: row.abstract?.slice(0, 280) ?? null,
    plainSummary: row.plainSummary,
    findings: row.findings?.slice(0, 3) ?? null,
    journal: row.journal,
    year: row.publicationDate
      ? new Date(row.publicationDate).getFullYear().toString()
      : null,
  }));

  try {
    const overview = await withTimeout(synthesizeSearchOverview(query, inputs), AI_TIMEOUT_MS);

    const result: SearchOverviewResponse = {
      query,
      summary: overview.summary,
      verdict: overview.verdict,
      verdictLabel: overview.verdict_label,
      sources: heuristic.sources,
      uncertainty: overview.uncertainty,
      disclaimer: RESEARCH_SUMMARY_DISCLAIMER,
      generatedBy: "ai",
    };
    await turboSetAsync(ck, result, TTL.overview);
    return result;
  } catch (error) {
    console.warn("AI overview unavailable, using heuristic:", error);
    return heuristic;
  }
}
