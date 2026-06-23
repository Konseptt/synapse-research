import { RER_NAME, RER_SHORT } from "@/lib/content/rer";
import { cn } from "@/lib/utils";

const RER_SIGNALS = [
  {
    name: "Study design",
    weight: "34%",
    detail: "Meta-analysis and RCTs rank above case reports, modeled on GRADE / Oxford CEBM levels.",
  },
  {
    name: "Sample size",
    weight: "16%",
    detail: "Parsed from abstracts (n=…); larger trials score higher on a log curve.",
  },
  {
    name: "Query relevance",
    weight: "16%",
    detail: "BM25-lite match between your question and title + abstract.",
  },
  {
    name: "Recency",
    weight: "12%",
    detail: "Newer publications score higher; missing dates get a neutral default.",
  },
  {
    name: "Rigor flags",
    weight: "14%",
    detail: "Blinding, placebo control, preregistration, minus conflicts or tiny samples.",
  },
  {
    name: "Journal tier",
    weight: "8%",
    detail: "High-impact venues (Lancet, NEJM, JAMA, Cochrane, etc.) get a boost.",
  },
] as const;

const DESIGN_LADDER = [
  "Network meta-analysis",
  "Meta-analysis / systematic review",
  "Randomized trial (RCT)",
  "Clinical trial",
  "Cohort",
  "Case-control",
  "Observational",
  "Case report",
  "Preclinical",
] as const;

interface RerExplainerProps {
  className?: string;
  /** Tighter layout for search empty state */
  compact?: boolean;
}

export function RerExplainer({ className, compact }: RerExplainerProps) {
  return (
    <section
      className={cn(
        "rounded-md border border-rule bg-surface-elevated text-left shadow-sm",
        compact ? "p-5" : "p-6 lg:p-8",
        className,
      )}
      aria-labelledby="rer-explainer-heading"
    >
      <p className="label-caps mb-2">How it works</p>
      <h2
        id="rer-explainer-heading"
        className={cn(
          "font-serif font-medium text-ink",
          compact ? "text-xl" : "text-2xl",
        )}
      >
        {RER_NAME} ({RER_SHORT})
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        I built a custom ranking algorithm for Synapse, not a generic LLM score. Every paper
        gets a transparent <strong className="font-medium text-ink">0–100 evidence score</strong>{" "}
        from PubMed metadata and abstract text alone. It runs in under a millisecond on every
        search, sorts results strongest-evidence-first, and powers the overview verdict.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {RER_SIGNALS.map((signal) => (
          <div
            key={signal.name}
            className="rounded-sm border border-rule/80 bg-paper px-3 py-2.5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-ink">{signal.name}</p>
              <span className="font-mono text-xs tabular-nums text-accent">{signal.weight}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{signal.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-rule/60 pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          Study design ladder (strongest → weakest)
        </p>
        <ol className="mt-2 flex flex-wrap gap-1.5">
          {DESIGN_LADDER.map((tier, i) => (
            <li
              key={tier}
              className="rounded-sm border border-rule bg-surface px-2 py-1 text-[0.6875rem] text-ink-muted"
            >
              <span className="mr-1 font-mono text-ink-faint">{i + 1}.</span>
              {tier}
            </li>
          ))}
        </ol>
      </div>

      <dl className="mt-6 grid gap-3 border-t border-rule/60 pt-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-medium text-ink">Deterministic</dt>
          <dd className="mt-0.5 text-xs leading-relaxed text-ink-muted">
            Same paper, same score. Reproducible and auditable.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-ink">No LLM for ranking</dt>
          <dd className="mt-0.5 text-xs leading-relaxed text-ink-muted">
            Regex + heuristics only; AI is separate for summaries and Q&amp;A.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-ink">After deep analysis</dt>
          <dd className="mt-0.5 text-xs leading-relaxed text-ink-muted">
            A second custom scorer refines the number once a paper is fully analyzed.
          </dd>
        </div>
      </dl>
    </section>
  );
}
