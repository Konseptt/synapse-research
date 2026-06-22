"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { decodeHtmlEntities } from "@/lib/analysis-utils";
import { getSearchOverview } from "@/lib/api/client";
import { buildHeuristicOverview } from "@/lib/search/heuristic-overview";
import type { PaperSummary, SearchOverviewResponse } from "@/types/paper";
import { cn } from "@/lib/utils";

const verdictStyles: Record<string, string> = {
  supports: "bg-accent-soft text-accent",
  mixed: "bg-signal-soft text-signal",
  contradictory: "bg-danger-soft text-danger",
  insufficient: "bg-surface text-ink-muted",
};

const sourceBadge: Record<string, string> = {
  ai: "AI synthesis",
  heuristic: "Instant read",
  instant: "Quick match",
};

interface SearchOverviewPanelProps {
  query: string;
  papers: PaperSummary[];
  initialOverview?: SearchOverviewResponse | null;
  selectedPaperId?: string | null;
  onSelectPaper?: (id: string) => void;
}

export function SearchOverviewPanel({
  query,
  papers,
  initialOverview,
  selectedPaperId,
  onSelectPaper,
}: SearchOverviewPanelProps) {
  // Auto-fetch the AI synthesis (the server pre-warms it into the shared cache
  // on search, so this is usually an instant cache hit rather than a cold call).
  const [wantAi, setWantAi] = useState(true);

  const paperIdsKey = useMemo(
    () => papers.slice(0, 8).map((p) => p.id).join(","),
    [papers],
  );
  const paperIds = useMemo(
    () => (paperIdsKey ? paperIdsKey.split(",") : []),
    [paperIdsKey],
  );

  const fast = useMemo(
    () => initialOverview ?? buildHeuristicOverview(query, papers.slice(0, 8)),
    [initialOverview, query, papers],
  );

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["overview", query, paperIdsKey, "ai"],
    queryFn: () => getSearchOverview(query, paperIds, true),
    enabled: wantAi && query.length > 2 && paperIds.length > 0 && fast.generatedBy !== "ai",
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const display = data?.generatedBy === "ai" ? data : fast;
  const aiPending = wantAi && isFetching && display.generatedBy !== "ai";
  const canEnhance = display.generatedBy !== "ai" && !aiPending;

  if (papers.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-md border border-rule bg-surface-elevated p-4 shadow-sm lg:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-serif text-lg font-medium text-ink">Overview</h2>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide",
            display.generatedBy === "ai"
              ? (verdictStyles[display.verdict] ?? verdictStyles.insufficient)
              : "bg-surface text-ink-muted",
          )}
        >
          {display.generatedBy === "ai" ? display.verdictLabel : sourceBadge[display.generatedBy ?? "heuristic"]}
        </span>
        {aiPending && (
          <span className="text-xs text-ink-faint">Deepening with AI…</span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-ink">
        {decodeHtmlEntities(display.summary)}
      </p>

      {display.uncertainty && display.generatedBy === "ai" && (
        <p className="mt-2 text-xs text-ink-muted">{display.uncertainty}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {canEnhance && (
          <button
            type="button"
            onClick={() => setWantAi(true)}
            className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent hover:bg-accent/10"
          >
            Deepen with AI
          </button>
        )}
        {(isError || (wantAi && !isFetching && display.generatedBy !== "ai")) && (
          <button
            type="button"
            onClick={() => {
              setWantAi(true);
              void refetch();
            }}
            className="text-xs font-medium text-accent hover:text-accent-hover"
          >
            Retry AI
          </button>
        )}
      </div>

      {display.sources.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-rule/60 pt-3">
          {display.sources.map((source) => (
            <button
              key={source.paperId}
              type="button"
              onClick={() => onSelectPaper?.(source.paperId)}
              className={cn(
                "max-w-[200px] truncate rounded-full border px-2 py-0.5 text-left text-[0.7rem] transition-colors",
                selectedPaperId === source.paperId
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-rule bg-paper text-ink-muted hover:border-accent-muted hover:text-ink",
              )}
              title={decodeHtmlEntities(source.title)}
            >
              <span className="font-mono text-[0.6rem] text-accent">[{source.index}]</span>{" "}
              {decodeHtmlEntities(source.title)}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
