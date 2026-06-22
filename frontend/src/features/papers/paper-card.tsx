import Link from "next/link";

import { ScoreBadge } from "@/components/score-badge";
import { decodeHtmlEntities } from "@/lib/analysis-utils";
import type { PaperSummary } from "@/types/paper";
import { cn } from "@/lib/utils";

interface PaperCardProps {
  paper: PaperSummary;
  selected?: boolean;
  compareSelected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onToggleCompare?: () => void;
}

export function PaperCard({
  paper,
  selected,
  compareSelected,
  compact,
  onClick,
  onToggleCompare,
}: PaperCardProps) {
  const year = paper.publicationDate?.slice(0, 4);

  return (
    <div
      className={cn(
        "w-full text-left transition-colors",
        compact ? "px-3 py-2.5" : "border-l-2 py-3 pl-3 pr-2",
        compact
          ? selected
            ? "bg-accent-soft/60"
            : "hover:bg-surface-elevated/80"
          : selected
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
            <h3
              className={cn(
                "line-clamp-2 font-medium leading-snug text-ink",
                compact ? "text-xs" : "font-serif text-[0.9375rem]",
              )}
            >
              {decodeHtmlEntities(paper.title)}
            </h3>
            {!compact && paper.evidenceScore != null && (
              <ScoreBadge score={paper.evidenceScore} />
            )}
          </div>
          {(paper.journal || year) && (
            <p className="mt-1 text-[0.625rem] text-ink-faint">
              {[paper.journal, year].filter(Boolean).join(" · ")}
            </p>
          )}
          {!compact && paper.abstract && (
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
