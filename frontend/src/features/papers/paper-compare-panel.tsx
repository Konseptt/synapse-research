"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/score-badge";
import { decodeHtmlEntities } from "@/lib/analysis-utils";
import { comparePapers, detectConflicts } from "@/lib/api/client";
import type { ConflictPairResult, PaperDetail } from "@/types/paper";

interface PaperComparePanelProps {
  paperIds: string[];
  onClear: () => void;
}

export function PaperComparePanel({ paperIds, onClear }: PaperComparePanelProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["compare", paperIds],
    queryFn: () => comparePapers(paperIds),
    enabled: paperIds.length >= 2,
  });

  const conflictCheck = useMutation({
    mutationFn: () => detectConflicts(paperIds),
  });

  const papers = data?.papers ?? [];

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
              <CompareRow label="Evidence" papers={papers} render={(p) =>
                p.evidenceScore != null ? <ScoreBadge score={p.evidenceScore} /> : "n/a"
              } />
              <CompareRow label="Methods" papers={papers} render={(p) =>
                p.analysis?.methodology ?? "Not analyzed"
              } />
              <CompareRow label="Sample" papers={papers} render={(p) =>
                p.analysis?.sampleSize ?? "n/a"
              } />
              <CompareRow label="Population" papers={papers} render={(p) =>
                p.analysis?.population ?? "n/a"
              } />
              <CompareRow label="Key findings" papers={papers} render={(p) =>
                p.analysis?.findings?.slice(0, 3).join("; ") ?? "n/a"
              } />
              <CompareRow label="Funding" papers={papers} render={(p) =>
                p.analysis?.funding ?? "Not stated"
              } />
              <CompareRow label="Conflicts of interest" papers={papers} render={(p) =>
                p.analysis?.conflictOfInterest ?? "Not stated"
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
            {pair.agreement ? "Mostly agree" : "Disagree or differ"}
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
