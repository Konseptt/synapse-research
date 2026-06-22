import { NextRequest, NextResponse } from "next/server";

import {
  TTL,
  cacheKey,
  turboGetAsync,
  turboSetAsync,
} from "@/lib/cache/turbo-cache";
import { config } from "@/lib/config";
import { runBackground } from "@/lib/jobs/run-background";
import { rankPapers } from "@/lib/search/evidence-rank";
import { expandSearchQuery } from "@/lib/search/query-helper";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import {
  buildFastOverview,
  buildSearchOverview,
  overviewCacheKey,
} from "@/lib/services/search-overview";
import { upsertPubMedPapers } from "@/lib/services/paper-sync";
import { searchPubMed } from "@/lib/services/pubmed";
import type { PubMedPaper } from "@/lib/services/pubmed";
import type { PaperSummary, SearchOverviewResponse } from "@/types/paper";

/** Top-N papers fed to the overview — must match the client panel (papers.slice(0, 8)). */
const OVERVIEW_PAPER_COUNT = 8;

interface SearchPayload {
  query: string;
  searchedAs: string;
  translatedFrom: string | null;
  searchHint: string | null;
  total: number;
  papers: PaperSummary[];
  overview: SearchOverviewResponse;
  aiOverviewCached: boolean;
}

function pubmedCacheKey(searchQuery: string, options: Record<string, string | undefined>): string {
  return cacheKey([
    "pubmed",
    searchQuery,
    options.yearFrom ?? "",
    options.yearTo ?? "",
    options.journal ?? "",
    options.studyType ?? "",
  ]);
}

function searchCacheKey(originalQuery: string, options: Record<string, string | undefined>): string {
  return cacheKey([
    "searchv2",
    originalQuery.toLowerCase().trim(),
    options.yearFrom ?? "",
    options.yearTo ?? "",
    options.journal ?? "",
    options.studyType ?? "",
  ]);
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`search:${ip}`, config.rateLimitPerMinute);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  if (!rawQuery.trim() || rawQuery === "undefined") {
    return NextResponse.json({ query: "", total: 0, papers: [] });
  }

  const { originalQuery, searchQuery, translatedFrom, searchHint } = expandSearchQuery(rawQuery);

  const yearFrom = request.nextUrl.searchParams.get("yearFrom");
  const yearTo = request.nextUrl.searchParams.get("yearTo");
  const journal = request.nextUrl.searchParams.get("journal");
  const studyType = request.nextUrl.searchParams.get("studyType");

  const pubmedOptions = {
    yearFrom: yearFrom ? Number(yearFrom) : undefined,
    yearTo: yearTo ? Number(yearTo) : undefined,
    studyType: studyType ?? undefined,
  };

  const filterOpts = {
    yearFrom: yearFrom ?? undefined,
    yearTo: yearTo ?? undefined,
    journal: journal ?? undefined,
    studyType: studyType ?? undefined,
  };

  try {
    // Fast path: a full, ready-to-render payload from a previous searcher
    // (shared via Redis). Skips PubMed, the DB, and the heuristic entirely.
    const responseKey = searchCacheKey(originalQuery, filterOpts);
    const cachedPayload = await turboGetAsync<SearchPayload>(responseKey);
    if (cachedPayload) {
      warmOverview(originalQuery, cachedPayload.papers);
      return NextResponse.json({ ...cachedPayload, cached: true });
    }

    const pmKey = pubmedCacheKey(searchQuery, filterOpts);
    let pubmedResults = await turboGetAsync<PubMedPaper[]>(pmKey);

    if (!pubmedResults) {
      pubmedResults = await searchPubMed(searchQuery, config.pubmedMaxResults, pubmedOptions);

      if (pubmedResults.length === 0 && searchQuery !== originalQuery) {
        pubmedResults = await searchPubMed(originalQuery, config.pubmedMaxResults, pubmedOptions);
      }
      await turboSetAsync(pmKey, pubmedResults, TTL.pubmed);
    }

    let filtered = pubmedResults;
    if (yearFrom) {
      filtered = filtered.filter(
        (p) => p.publicationDate && p.publicationDate.getFullYear() >= Number(yearFrom),
      );
    }
    if (yearTo) {
      filtered = filtered.filter(
        (p) => p.publicationDate && p.publicationDate.getFullYear() <= Number(yearTo),
      );
    }
    if (journal) {
      filtered = filtered.filter((p) =>
        p.journal?.toLowerCase().includes(journal.toLowerCase()),
      );
    }

    const persisted = await upsertPubMedPapers(filtered);

    // Rank by Research Evidence Rank: orders the list strongest-evidence-first
    // and gives every paper an instant evidence score + design tag (the DB
    // score, when a full analysis exists, wins over the heuristic one).
    const summaries = rankPapers(originalQuery, persisted).map((r) => ({
      ...r.paper,
      evidenceScore: r.paper.evidenceScore ?? r.rer,
      evidenceTier: r.designLabel,
    }));

    const fastOverview = buildFastOverview(originalQuery, summaries);
    const overviewIds = summaries.slice(0, OVERVIEW_PAPER_COUNT).map((p) => p.id);
    const aiCached = await turboGetAsync<SearchOverviewResponse>(
      overviewCacheKey(originalQuery, overviewIds),
    );

    const payload: SearchPayload = {
      query: originalQuery,
      searchedAs: searchQuery,
      translatedFrom: translatedFrom ?? null,
      searchHint: searchHint ?? null,
      total: summaries.length,
      papers: summaries,
      overview: aiCached ?? fastOverview,
      aiOverviewCached: Boolean(aiCached),
    };

    await turboSetAsync(responseKey, payload, TTL.search);

    // Precompute the AI overview after responding so the panel's fetch is a
    // cache hit instead of a cold multi-second LLM round-trip.
    warmOverview(originalQuery, summaries);

    return NextResponse.json({ ...payload, cached: false });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

/** Fire-and-forget AI-overview warming into the shared cache. */
function warmOverview(query: string, summaries: PaperSummary[]): void {
  if (!config.nvidiaApiKey || summaries.length < 2) return;
  const ids = summaries.slice(0, OVERVIEW_PAPER_COUNT).map((p) => p.id);
  void runBackground(async () => {
    await buildSearchOverview(query, ids).catch(() => {});
  });
}
