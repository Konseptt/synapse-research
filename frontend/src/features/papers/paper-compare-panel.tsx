"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/score-badge";
import { decodeHtmlEntities, isAnalysisReady } from "@/lib/analysis-utils";
import { analyzePaper, comparePapers, detectConflicts } from "@/lib/api/client";
import { resolveDisclosure } from "@/lib/services/disclosure-extract";
import type { ConflictPairResult, PaperDetail } from "@/types/paper";

interface PaperComparePanelProps {
  paperIds: string[];
  onClear: () => void;
}

// Give up polling after this long so a stuck analysis doesn't poll forever.
const ANALYZE_TIMEOUT_MS = 5 * 60 * 1000;

function needsAnalysis(p: PaperDetail): boolean {
  return !isAnalysisReady(p.analysis) && p.analysis?.status !== "failed";
}

function formatDisclosure(p: PaperDetail, kind: "funding" | "coi"): string {
  const stored = kind === "funding" ? p.analysis?.funding : p.analysis?.conflictOfInterest;
  const paperText = p.fullText ?? p.abstract ?? "";
  const resolved = resolveDisclosure(stored, paperText, kind);
  if (resolved) return resolved;
  if (isAnalysisReady(p.analysis)) return "Not in abstract";
  return "Not stated";
}

export function PaperComparePanel({ paperIds, onClear }: PaperComparePanelProps) {
  const triggered = useRef<Set<string>>(new Set());
  const startedAt = useRef<number | null>(null);
  const [analyzeErrors, setAnalyzeErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["compare", paperIds],
    queryFn: () => comparePapers(paperIds),
    enabled: paperIds.length >= 2,
    // While any paper is still being analyzed, re-poll so the table fills in.
    refetchInterval: (query) => {
      const list = query.state.data?.papers;
      if (!list || list.length === 0) return false;
      if (!list.some(needsAnalysis)) return false;
      if (startedAt.current && Date.now() - startedAt.current > ANALYZE_TIMEOUT_MS) {
        return false;
      }
      return 4000;
    },
  });

  const conflictCheck = useMutation({
    mutationFn: () => detectConflicts(paperIds),
  });

  const papers = data?.papers ?? [];

  // Opening Compare should not show a wall of "n/a": kick off analysis for any
  // paper never analyzed, then the poll above fills the table as each finishes.
  const toAnalyze = papers.filter(needsAnalysis).map((p) => p.id);
  const toAnalyzeKey = toAnalyze.join(",");

  useEffect(() => {
    const fresh = toAnalyze.filter((id) => !triggered.current.has(id));
    if (fresh.length === 0) return;
    if (startedAt.current == null) startedAt.current = Date.now();
    for (const id of fresh) {
      triggered.current.add(id);
      void analyzePaper(id).catch((err) => {
        triggered.current.delete(id);
        setAnalyzeErrors((prev) => ({
          ...prev,
          [id]: err instanceof Error ? err.message : "Analysis failed",
        }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toAnalyzeKey]);

  const pendingIds = new Set(toAnalyze);
  const readingCount = toAnalyze.length;
  const cell = (p: PaperDetail, value: ReactNode): ReactNode => {
    if (analyzeErrors[p.id]) {
      return <span className="text-danger text-xs">{analyzeErrors[p.id]}</span>;
    }
    if (pendingIds.has(p.id)) return <span className="text-ink-faint">Reading…</span>;
    if (p.analysis?.status === "failed") return <span className="text-ink-faint">Couldn’t read this one</span>;
    return value;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label-caps">Compare ({paperIds.length} papers)</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={paperIds.length < 2 || conflictCheck.isPending}
            onClick={() => conflictCheck.mutate()}
          >
            {conflictCheck.isPending ? "Checking…" : "Detect conflicts"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear}>
            Clear
          </Button>
        </div>
      </div>

      {readingCount > 0 && (
        <p className="border border-dashed border-rule px-3 py-2 text-xs text-ink-muted">
          Reading {readingCount} {readingCount === 1 ? "study" : "studies"}… the table fills
          in as each one finishes. Usually 1–2 minutes.
        </p>
      )}

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <div className="space-y-2">
          <p className="text-sm text-danger">Could not load comparison.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="py-2 pr-3 font-medium text-ink-muted">Field</th>
                {papers.map((p) => (
                  <th key={p.id} className="max-w-[200px] py-2 pr-3 font-serif font-medium text-ink">
                    <span className="line-clamp-2">{decodeHtmlEntities(p.title)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule/60">
              <CompareRow label="Evidence (RER)" papers={papers} render={(p) =>
                cell(p, p.evidenceScore != null ? <ScoreBadge score={p.evidenceScore} /> : "n/a")
              } />
              <CompareRow label="Methods" papers={papers} render={(p) =>
                cell(p, p.analysis?.methodology ?? "n/a")
              } />
              <CompareRow label="Sample" papers={papers} render={(p) =>
                cell(p, p.analysis?.sampleSize ?? "n/a")
              } />
              <CompareRow label="Population" papers={papers} render={(p) =>
                cell(p, p.analysis?.population ?? "n/a")
              } />
              <CompareRow label="Key findings" papers={papers} render={(p) =>
                cell(p, p.analysis?.findings?.slice(0, 3).join("; ") ?? "n/a")
              } />
              <CompareRow label="Funding" papers={papers} render={(p) =>
                cell(p, formatDisclosure(p, "funding"))
              } />
              <CompareRow label="Conflicts of interest" papers={papers} render={(p) =>
                cell(p, formatDisclosure(p, "coi"))
              } />
            </tbody>
          </table>
        </div>
      )}

      {conflictCheck.data?.pairs && conflictCheck.data.pairs.length > 0 && (
        <ConflictResults pairs={conflictCheck.data.pairs} />
      )}
      {conflictCheck.error && (
        <p className="text-sm text-danger">{conflictCheck.error.message}</p>
      )}
    </div>
  );
}

function CompareRow({
  label,
  papers,
  render,
}: {
  label: string;
  papers: PaperDetail[];
  render: (paper: PaperDetail) => ReactNode;
}) {
  return (
    <tr>
      <td className="py-3 pr-3 align-top text-xs font-medium text-ink-faint">{label}</td>
      {papers.map((p) => (
        <td key={p.id} className="py-3 pr-3 align-top text-xs leading-relaxed text-ink-muted">
          {render(p)}
        </td>
      ))}
    </tr>
  );
}

function ConflictResults({ pairs }: { pairs: ConflictPairResult[] }) {
  return (
    <div className="space-y-3 border border-rule bg-surface-elevated p-4">
      <p className="label-caps">Conflict analysis</p>
      {pairs.map((pair) => (
        <div
          key={`${pair.paperAId}-${pair.paperBId}`}
          className={`rounded-sm border px-3 py-2 text-sm ${
            pair.agreement ? "border-accent-muted/40 bg-accent-soft/20" : "border-signal/30 bg-signal-soft/30"
          }`}
        >
          <p className="font-medium text-ink">
            {pair.agreement ? "Findings agree" : "Findings differ"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {decodeHtmlEntities(pair.paperATitle.slice(0, 60))} vs{" "}
            {decodeHtmlEntities(pair.paperBTitle.slice(0, 60))}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">{pair.reason}</p>
        </div>
      ))}
    </div>
  );
}
