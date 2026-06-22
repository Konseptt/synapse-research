import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const QUALITY_LABELS: Record<string, string> = {
  high: "Strong study",
  medium: "Moderate study",
  low: "Early or small study",
  unknown: "Limited info",
};

export function ScoreBadge({
  score,
  className,
  showLabel = false,
}: {
  score: number;
  className?: string;
  showLabel?: boolean;
}) {
  const variant =
    score >= 70 ? "default" : score >= 40 ? "secondary" : score >= 20 ? "signal" : "outline";

  const qualityKey =
    score >= 70 ? "high" : score >= 40 ? "medium" : score >= 20 ? "low" : "unknown";

  return (
    <div
      className={cn("flex shrink-0 flex-col items-end gap-0.5", className)}
      title={`Study quality score: ${Math.round(score)} out of 100. Higher usually means larger, newer, or more rigorous designs.`}
    >
      <Badge variant={variant} className="tabular-nums">
        {Math.round(score)}
      </Badge>
      {showLabel && (
        <span className="text-[0.625rem] text-ink-faint">{QUALITY_LABELS[qualityKey]}</span>
      )}
    </div>
  );
}
