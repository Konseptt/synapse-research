"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { SearchBox } from "@/components/search-box";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/score-badge";
import { SearchWelcome } from "@/components/search-welcome";
import { EvidencePanel } from "@/features/evidence/evidence-panel";
import { PaperCard } from "@/features/papers/paper-card";
import { PaperComparePanel } from "@/features/papers/paper-compare-panel";
import { PaperAnalysisSection } from "@/features/papers/paper-analysis-section";
import { PaperMetadata } from "@/features/papers/paper-metadata";
import { SearchFiltersPanel } from "@/features/search/search-filters";
import { SearchOverviewPanel } from "@/features/search/search-overview-panel";
import { useAnalyzePaper } from "@/hooks/use-analyze-paper";
import { usePaperQuery } from "@/hooks/use-paper-query";
import { decodeHtmlEntities } from "@/lib/analysis-utils";
import { searchPapers } from "@/lib/api/client";
import { exportRisFile } from "@/lib/citations/format-citation";
import { useSearchStore } from "@/stores/search-store";
import { cn } from "@/lib/utils";

type CenterTab = "study" | "compare" | "ask";

export default function SearchPage() {
  const router = useRouter();
  const {
    query,
    submittedQuery,
    filters,
    selectedPaperId,
    comparePaperIds,
    chatPaperIds,
    setQuery,
    searchTopic,
    setFilters,
    setSelectedPaperId,
    toggleComparePaper,
    clearCompare,
    setChatPaperIds,
  } = useSearchStore();

  const [centerTab, setCenterTab] = useState<CenterTab>("study");
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [abstractOpen, setAbstractOpen] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && q.trim().length > 2) {
      searchTopic(q.trim());
    }
  }, [searchTopic]);

  const hasActiveSearch = submittedQuery.length > 2;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["search", submittedQuery, filters],
    queryFn: () => searchPapers(submittedQuery, filters as Record<string, string | number | undefined>),
    enabled: hasActiveSearch,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  const {
    data: selectedPaper,
    isLoading: paperLoading,
    isError: paperError,
    error: paperFetchError,
    refetch: refetchPaper,
  } = usePaperQuery(selectedPaperId);

  const analyze = useAnalyzePaper(selectedPaperId);

  const papers = useMemo(() => data?.papers ?? [], [data?.papers]);
  const selectedIndex = papers.findIndex((p) => p.id === selectedPaperId);
  const topResultIds = useMemo(() => papers.slice(0, 5).map((p) => p.id), [papers]);

  const resolvedChatIds = useMemo(() => {
    if (chatPaperIds && chatPaperIds.length > 0) return chatPaperIds;
    if (comparePaperIds.length >= 2) return comparePaperIds;
    if (selectedPaperId) return [selectedPaperId];
    return topResultIds;
  }, [chatPaperIds, comparePaperIds, selectedPaperId, topResultIds]);

  const chatActiveScope = useMemo((): "compared" | "top" | "selected" => {
    if (chatPaperIds && comparePaperIds.length >= 2 && chatPaperIds.every((id) => comparePaperIds.includes(id))) {
      return "compared";
    }
    if (chatPaperIds && topResultIds.length > 0 && chatPaperIds.every((id) => topResultIds.includes(id))) {
      return "top";
    }
    if (comparePaperIds.length >= 2 && !chatPaperIds) return "compared";
    return selectedPaperId ? "selected" : "top";
  }, [chatPaperIds, comparePaperIds, topResultIds, selectedPaperId]);

  const searchedAsHint = useMemo(() => {
    if (!data?.searchedAs || data.searchedAs === submittedQuery) return null;
    return data.searchedAs;
  }, [data?.searchedAs, submittedQuery]);

  const handleSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length <= 2) return;
      setQuery(trimmed);
      searchTopic(trimmed);
      setCenterTab("study");
      setAbstractOpen(false);
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
    },
    [setQuery, searchTopic, router],
  );

  const handleSelectPaper = useCallback(
    (id: string) => {
      setSelectedPaperId(id);
      setCenterTab("study");
      setAbstractOpen(false);
      setMobileListOpen(false);
    },
    [setSelectedPaperId],
  );

  const handleAnalyze = useCallback(
    (force = false) => {
      analyze.mutate(force, {
        onError: (err) => console.error(err),
      });
    },
    [analyze],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "j" && papers.length > 0) {
        const next = Math.min(selectedIndex + 1, papers.length - 1);
        setSelectedPaperId(papers[next].id);
      }
      if (e.key === "k" && papers.length > 0) {
        const prev = Math.max(selectedIndex - 1, 0);
        setSelectedPaperId(papers[prev].id);
      }
    },
    [papers, selectedIndex, setSelectedPaperId],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (papers.length > 0 && !selectedPaperId) {
      setSelectedPaperId(papers[0].id);
    }
  }, [papers, selectedPaperId, setSelectedPaperId]);

  useEffect(() => {
    setAbstractOpen(false);
  }, [selectedPaperId]);

  const resultsList = (
    <>
      {isLoading ? (
        <div className="space-y-2 p-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <div className="space-y-2 p-4">
          <p className="text-sm text-danger">
            Search failed: {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : papers.length === 0 ? (
        <p className="p-4 text-sm text-ink-muted">No studies matched. Try broader terms.</p>
      ) : (
        <div className="divide-y divide-rule/70">
          {papers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              compact
              selected={paper.id === selectedPaperId}
              compareSelected={comparePaperIds.includes(paper.id)}
              onClick={() => handleSelectPaper(paper.id)}
              onToggleCompare={() => toggleComparePaper(paper.id)}
            />
          ))}
        </div>
      )}
    </>
  );

  if (!hasActiveSearch) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-surface">
        <SearchWelcome
          query={query}
          onQueryChange={setQuery}
          onSearch={handleSearch}
          onSelectTopic={handleSearch}
        />
      </div>
    );
  }

  const showCompareTab = comparePaperIds.length >= 2;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-surface">
      <div className="sticky top-14 z-30 border-b border-rule bg-surface-elevated/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 lg:px-6">
          <SearchBox value={query} onChange={setQuery} onSearch={handleSearch} />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
            <span>
              {isLoading ? "Searching…" : `${data?.total ?? 0} studies`}
              {submittedQuery && <> for &ldquo;{submittedQuery}&rdquo;</>}
            </span>
            {searchedAsHint && (
              <span className="text-[0.65rem] text-accent">
                Searched PubMed for: {searchedAsHint}
              </span>
            )}
            {data?.searchHint && (
              <span className="text-[0.65rem] text-accent">
                Interpreted as {data.searchHint}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {comparePaperIds.length > 0 && (
                <span>{comparePaperIds.length} to compare</span>
              )}
              {papers.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => exportRisFile(papers, `synapse-${submittedQuery.slice(0, 30)}.ris`)}
                >
                  Export
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-rule bg-paper lg:flex xl:w-80">
          <div className="border-b border-rule p-3">
            <SearchFiltersPanel filters={filters} onChange={setFilters} />
            <p className="mt-2 text-[0.65rem] text-ink-faint">Tap + to compare up to 3 studies</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{resultsList}</div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-4 lg:p-6">
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setMobileListOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-sm border border-rule bg-paper px-3 py-2 text-sm font-medium text-ink"
              >
                <span>{papers.length} studies</span>
                <span className="text-xs text-ink-faint">{mobileListOpen ? "Hide" : "Show list"}</span>
              </button>
              {mobileListOpen && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-sm border border-rule bg-paper">
                  {resultsList}
                </div>
              )}
            </div>

            {!isLoading && papers.length > 0 && (
              <SearchOverviewPanel
                query={submittedQuery}
                papers={papers}
                initialOverview={data?.overview}
                selectedPaperId={selectedPaperId}
                onSelectPaper={handleSelectPaper}
              />
            )}

            <div className="flex w-full rounded-md border border-rule bg-paper p-0.5">
              <button
                type="button"
                onClick={() => setCenterTab("study")}
                className={cn(
                  "flex-1 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                  centerTab === "study" ? "bg-accent text-paper shadow-sm" : "text-ink-muted hover:text-ink",
                )}
              >
                Study
              </button>
              {showCompareTab && (
                <button
                  type="button"
                  onClick={() => setCenterTab("compare")}
                  className={cn(
                    "flex-1 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                    centerTab === "compare" ? "bg-accent text-paper shadow-sm" : "text-ink-muted hover:text-ink",
                  )}
                >
                  Compare ({comparePaperIds.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setCenterTab("ask")}
                className={cn(
                  "flex-1 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                  centerTab === "ask" ? "bg-accent text-paper shadow-sm" : "text-ink-muted hover:text-ink",
                )}
              >
                Ask
              </button>
            </div>

            {centerTab === "ask" ? (
              <EvidencePanel
                variant="inline"
                alwaysExpanded
                paperIds={resolvedChatIds}
                showScopeToggle={comparePaperIds.length >= 2 && topResultIds.length > 1}
                activeScope={chatActiveScope}
                onUseCompared={
                  comparePaperIds.length >= 2 ? () => setChatPaperIds(comparePaperIds) : undefined
                }
                onUseTopResults={
                  topResultIds.length > 1 ? () => setChatPaperIds(topResultIds) : undefined
                }
              />
            ) : centerTab === "compare" && showCompareTab ? (
              <PaperComparePanel
                paperIds={comparePaperIds}
                onClear={() => {
                  clearCompare();
                  setCenterTab("study");
                }}
              />
            ) : paperLoading ? (
              <div className="space-y-3 rounded-sm border border-rule bg-paper p-5">
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : paperError ? (
              <div className="rounded-sm border border-rule bg-paper p-5">
                <p className="text-sm text-danger">
                  Could not load study:{" "}
                  {paperFetchError instanceof Error ? paperFetchError.message : "Unknown error"}
                </p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => refetchPaper()}>
                  Retry
                </Button>
              </div>
            ) : selectedPaper ? (
              <article className="rounded-sm border border-rule bg-paper p-5 lg:p-6">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h1 className="font-serif text-xl font-medium leading-snug text-ink">
                    {decodeHtmlEntities(selectedPaper.title)}
                  </h1>
                  {selectedPaper.evidenceScore != null && (
                    <ScoreBadge score={selectedPaper.evidenceScore} showLabel />
                  )}
                </div>
                <PaperMetadata paper={selectedPaper} showCopyCitation />
                {selectedPaper.authors && (
                  <p className="my-3 text-xs text-ink-muted">
                    {selectedPaper.authors.map(decodeHtmlEntities).slice(0, 6).join(", ")}
                  </p>
                )}
                {selectedPaper.abstract ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setAbstractOpen((v) => !v)}
                      className="text-xs font-medium text-accent hover:text-accent-hover"
                    >
                      {abstractOpen ? "Hide abstract" : "Read abstract"}
                    </button>
                    {abstractOpen && (
                      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                        {decodeHtmlEntities(selectedPaper.abstract)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink-faint">No abstract available.</p>
                )}
                <div className="mt-5">
                  <PaperAnalysisSection
                    paper={selectedPaper}
                    paperId={selectedPaperId!}
                    onAnalyze={handleAnalyze}
                    analyzing={analyze.isPending}
                    analyzeError={analyze.error?.message ?? null}
                    compact
                  />
                </div>
              </article>
            ) : (
              <p className="text-sm text-ink-muted">Select a study from the list.</p>
            )}

            <MedicalDisclaimer className="pb-4 text-xs" />
          </div>
        </main>
      </div>
    </div>
  );
}
