import { MEDICAL_DISCLAIMER } from "@/lib/content/public-topics";
import { cn } from "@/lib/utils";

export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-sm border border-rule bg-paper px-3 py-2 text-xs leading-relaxed text-ink-muted",
        className,
      )}
      role="note"
    >
      {MEDICAL_DISCLAIMER}
    </p>
  );
}
