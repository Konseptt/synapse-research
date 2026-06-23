import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score-badge";
import { RER_COMPACT_TOOLTIP } from "@/lib/content/rer";
import { decodeHtmlEntities } from "@/lib/analysis-utils";
import type { PaperSummary } from "@/types/paper";
import { cn } from "@/lib/utils";

function scoreVariant(score: number): "default" | "secondary" | "signal" | "outline" {
  if (score >= 70) return "default";
  if (score >= 40) return "secondary";
  if (score >= 20) return "signal";
  return "outline";
}

interface PaperCardProps {
  paper: PaperSummary;
  selected?: boolean;
  compareSelected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onPrefetch?: () => void;
  onToggleCompare?: () => void;
}

export function PaperCard({
  paper,
  selected,
  compareSelected,
  compact,
  onClick,
  onPrefetch,
  onToggleCompare,
}: PaperCardProps) {
  const year = paper.publicationDate?.slice(0, 4);
  const metaLine = [paper.journal, year].filter(Boolean).join(" · ");

  if (compact) {
    return (
      <div
        onMouseEnter={onPrefetch}
        onFocus={onPrefetch}
        className={cn(
          "w-full px-3 py-2.5 text-left transition-colors",
          selected ? "bg-accent-soft/60" : "hover:bg-surface-elevated/80",
        )}
      >
        <div className="flex gap-2">
          {onToggleCompare && (
            <button
              type="button"
              aria-label={compareSelected ? "Remove from compare" : "Add to compare"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare();
              }}
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border text-[0.6875rem] leading-none",
                compareSelected
                  ? "border-accent bg-accent text-paper"
                  : "border-rule text-ink-faint hover:border-accent-muted",
              )}
            >
              {compareSelected ? "✓" : "+"}
            </button>
          )}
          <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left">
            <h3 className="line-clamp-2 text-xs font-medium leading-snug text-ink">
              {decodeHtmlEntities(paper.title)}
            </h3>
            {(paper.evidenceScore != null || paper.evidenceTier || metaLine) && (
              <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                {paper.evidenceScore != null && (
                  <Badge
                    variant={scoreVariant(paper.evidenceScore)}
                    className="h-5 shrink-0 px-1.5 py-0 text-[0.625rem] tabular-nums"
                    title={RER_COMPACT_TOOLTIP(paper.evidenceScore)}
                  >
                    {Math.round(paper.evidenceScore)}
                  </Badge>
                )}
                {paper.evidenceTier && (
                  <span
                    className="max-w-[6.5rem] shrink-0 truncate rounded-sm border border-rule bg-surface px-1.5 py-px text-[0.5625rem] font-medium uppercase tracking-wide text-ink-muted"
                    title={paper.evidenceTier}
                  >
                    {paper.evidenceTier}
                  </span>
                )}
                {metaLine && (
                  <span
                    className="min-w-0 truncate text-[0.625rem] text-ink-faint"
                    title={metaLine}
                  >
                    {metaLine}
                  </span>
                )}
              </div>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className={cn(
        "w-full border-l-2 py-3 pl-3 pr-2 text-left transition-colors",
        selected
          ? "border-l-accent bg-accent-soft/50"
          : "border-l-transparent hover:border-l-rule-strong hover:bg-surface-elevated/80",
      )}
    >
      <div className="flex gap-2">
        {onToggleCompare && (
          <button
            type="button"
            aria-label={compareSelected ? "Remove from compare" : "Add to compare"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare();
            }}
            className={cn(
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[0.625rem] leading-none",
              compareSelected
                ? "border-accent bg-accent text-paper"
                : "border-rule text-ink-faint hover:border-accent-muted",
            )}
          >
            {compareSelected ? "✓" : "+"}
          </button>
        )}
        <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-serif text-[0.9375rem] font-medium leading-snug text-ink">
              {decodeHtmlEntities(paper.title)}
            </h3>
            {paper.evidenceScore != null && <ScoreBadge score={paper.evidenceScore} />}
          </div>
          {(paper.evidenceTier || metaLine) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {paper.evidenceTier && (
                <span className="rounded-sm border border-rule bg-surface px-1.5 py-px text-[0.5625rem] font-medium uppercase tracking-wide text-ink-muted">
                  {paper.evidenceTier}
                </span>
              )}
              {metaLine && (
                <span className="text-[0.625rem] text-ink-faint">{metaLine}</span>
              )}
            </div>
          )}
          {paper.abstract && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">
              {decodeHtmlEntities(paper.abstract)}
            </p>
          )}
        </button>
      </div>
    </div>
  );
}

export function PaperCardLink({ paper }: { paper: PaperSummary }) {
  return (
    <Link href={`/paper/${paper.id}`} className="block">
      <PaperCard paper={paper} />
    </Link>
  );
}
