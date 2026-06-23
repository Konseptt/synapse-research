"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isAnalysisPending, isAnalysisReady } from "@/lib/analysis-utils";
import type { PaperDetail } from "@/types/paper";

interface PaperAnalysisSectionProps {
  paper: PaperDetail;
  onAnalyze: (force?: boolean) => void;
  analyzing: boolean;
  analyzeError: string | null;
  paperId: string;
  compact?: boolean;
}

const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export function PaperAnalysisSection({
  paper,
  onAnalyze,
  analyzing,
  analyzeError,
  paperId,
  compact,
}: PaperAnalysisSectionProps) {
  const analysis = paper.analysis;
  const [pendingSince, setPendingSince] = useState<number | null>(null);

  useEffect(() => {
    if (isAnalysisPending(analysis) || analyzing) {
      setPendingSince((s) => s ?? Date.now());
    } else {
      setPendingSince(null);
    }
  }, [analysis, analyzing]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (pendingSince == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [pendingSince]);

  const pollExhausted =
    pendingSince != null && now - pendingSince > POLL_TIMEOUT_MS;

  if (isAnalysisReady(analysis)) {
    return (
      <div className="border border-rule bg-accent-soft/30 p-4">
        <p className="label-caps mb-2">Plain English summary</p>
        {analysis?.plainSummary ? (
          <p className="text-base leading-relaxed text-ink">{analysis.plainSummary}</p>
        ) : analysis?.researchQuestion ? (
          <p className="text-base leading-relaxed text-ink">{analysis.researchQuestion}</p>
        ) : null}

        {analysis?.findings && analysis.findings.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-ink-muted">Key findings</p>
            <ul className="space-y-2">
              {analysis.findings.map((f, i) => (
                <li key={i} className="text-sm leading-relaxed text-ink-muted">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!compact && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium text-accent hover:text-accent-hover">
              Methods & sample
            </summary>
            <div className="mt-2 space-y-2 border-t border-rule/60 pt-2 text-ink-muted">
              {analysis?.methodology && <p>{analysis.methodology}</p>}
              {analysis?.sampleSize && <p>Sample size: {analysis.sampleSize}</p>}
              {analysis?.population && <p>Population: {analysis.population}</p>}
              {analysis?.funding && (
                <p>
                  <span className="font-medium text-ink">Funding: </span>
                  {analysis.funding}
                </p>
              )}
              {analysis?.conflictOfInterest && (
                <p>
                  <span className="font-medium text-ink">Conflicts of interest: </span>
                  {analysis.conflictOfInterest}
                </p>
              )}
            </div>
          </details>
        )}

        {compact && (analysis?.funding || analysis?.conflictOfInterest) && (
          <div className="mt-4 space-y-2 border-t border-rule/60 pt-3 text-xs text-ink-muted">
            {analysis.funding && (
              <p>
                <span className="font-medium text-ink">Funding: </span>
                {analysis.funding}
              </p>
            )}
            {analysis.conflictOfInterest && (
              <p>
                <span className="font-medium text-ink">Conflicts: </span>
                {analysis.conflictOfInterest}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!compact && (
            <Link
              href={`/paper/${paperId}`}
              className="inline-block text-xs font-medium text-accent hover:text-accent-hover"
            >
              View full analysis
            </Link>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => onAnalyze(true)}
            disabled={analyzing}
          >
            Re-run analysis
          </Button>
        </div>
      </div>
    );
  }

  if (isAnalysisPending(analysis) || analyzing) {
    return (
      <div className="space-y-2 border border-dashed border-rule p-4">
        <p className="text-sm text-ink-muted">
          {pollExhausted
            ? "This is taking longer than expected. You can wait or retry."
            : "Analyzing… usually 1-2 minutes for abstracts, longer for PDFs."}
        </p>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        {pollExhausted && (
          <Button size="sm" variant="outline" onClick={() => onAnalyze(true)} disabled={analyzing}>
            Retry analysis
          </Button>
        )}
        {!compact && (
          <Link
            href={`/paper/${paperId}`}
            className="inline-block text-xs font-medium text-accent hover:text-accent-hover"
          >
            Open full page →
          </Link>
        )}
      </div>
    );
  }

  if (analysis?.status === "failed") {
    return (
      <div className="space-y-2 border border-danger/30 bg-danger-soft p-4">
        <p className="text-sm text-danger">Analysis failed. Check your API key or try again.</p>
        <Button size="sm" variant="outline" onClick={() => onAnalyze(true)} disabled={analyzing}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-muted">
        Get a plain-English summary and the key findings from this study.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onAnalyze(false)} disabled={analyzing}>
          {analyzing ? "Analyzing…" : "Analyze paper"}
        </Button>
        <Link href={`/paper/${paperId}`}>
          <Button size="sm" variant="outline">
            Open full page
          </Button>
        </Link>
      </div>
      {analyzeError && <p className="text-xs text-danger">{analyzeError}</p>}
    </div>
  );
}
