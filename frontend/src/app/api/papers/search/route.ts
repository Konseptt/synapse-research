import { NextRequest, NextResponse } from "next/server";

import { TTL, cacheKey, turboGet, turboSet } from "@/lib/cache/turbo-cache";
import { config } from "@/lib/config";
import { expandSearchQuery } from "@/lib/search/query-helper";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import {
  buildFastOverview,
  overviewCacheKey,
} from "@/lib/services/search-overview";
import { upsertPubMedPapers } from "@/lib/services/paper-sync";
import { searchPubMed } from "@/lib/services/pubmed";
import type { PubMedPaper } from "@/lib/services/pubmed";

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
    const pmKey = pubmedCacheKey(searchQuery, filterOpts);
    let pubmedResults = turboGet<PubMedPaper[]>(pmKey);

    if (!pubmedResults) {
      pubmedResults = await searchPubMed(searchQuery, config.pubmedMaxResults, pubmedOptions);

      if (pubmedResults.length === 0 && searchQuery !== originalQuery) {
        pubmedResults = await searchPubMed(originalQuery, config.pubmedMaxResults, pubmedOptions);
      }
      turboSet(pmKey, pubmedResults, TTL.pubmed);
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

    const summaries = await upsertPubMedPapers(filtered);

    const fastOverview = buildFastOverview(originalQuery, summaries);
    const aiCached = turboGet(overviewCacheKey(originalQuery, summaries.map((p) => p.id)));

    return NextResponse.json({
      query: originalQuery,
      searchedAs: searchQuery,
      translatedFrom: translatedFrom ?? null,
      searchHint: searchHint ?? null,
      total: summaries.length,
      papers: summaries,
      overview: aiCached ?? fastOverview,
      aiOverviewCached: Boolean(aiCached),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
