"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EXAMPLE_QUESTIONS, MULTI_PAPER_QUESTIONS } from "@/lib/content/public-topics";
import { researchChat } from "@/lib/api/client";
import { ApiError } from "@/lib/fetch-json";
import type { CitationSource } from "@/types/paper";
import { cn } from "@/lib/utils";

interface EvidencePanelProps {
  paperIds: string[];
  onUseCompared?: () => void;
  onUseTopResults?: () => void;
  showScopeToggle?: boolean;
  activeScope?: "compared" | "top" | "selected";
  variant?: "sidebar" | "inline";
  /** When true, panel stays open (e.g. inside search tabs) */
  alwaysExpanded?: boolean;
}

export function EvidencePanel({
  paperIds,
  onUseCompared,
  onUseTopResults,
  showScopeToggle,
  activeScope,
  variant = "sidebar",
  alwaysExpanded = false,
}: EvidencePanelProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<CitationSource[]>([]);
  const [uncertainty, setUncertainty] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(variant === "inline" || alwaysExpanded);
  const answerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const multiPaper = paperIds.length > 1;
  const allSuggestions = multiPaper ? MULTI_PAPER_QUESTIONS : EXAMPLE_QUESTIONS;
  const availableSuggestions = useMemo(
    () => allSuggestions.filter((q) => !usedQuestions.has(q)),
    [allSuggestions, usedQuestions],
  );

  const paperIdsKey = paperIds.join(",");
  const [prevPaperIdsKey, setPrevPaperIdsKey] = useState(paperIdsKey);
  if (prevPaperIdsKey !== paperIdsKey) {
    setPrevPaperIdsKey(paperIdsKey);
    setUsedQuestions(new Set());
    setAnswer(null);
    setSources([]);
    setUncertainty(null);
    setError(null);
    setQuery("");
  }

  const isOpen = variant !== "inline" || alwaysExpanded || expanded;

  function askSuggested(question: string) {
    setUsedQuestions((prev) => new Set(prev).add(question));
    setQuery("");
    setExpanded(true);
    void handleAsk(question);
  }

  async function handleAsk(question: string) {
    if (!question.trim() || paperIds.length === 0) return;

    const cacheKey = ["chat", paperIds.join(","), question.trim()] as const;
    const cached = queryClient.getQueryData<Awaited<ReturnType<typeof researchChat>>>(cacheKey);
    if (cached) {
      setAnswer(cached.answer);
      setSources(cached.sources);
      setUncertainty(cached.uncertainty);
      setError(null);
      setQuery("");
      return;
    }

    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);
    setUncertainty(null);

    try {
      const res = await researchChat(question, paperIds);
      queryClient.setQueryData(cacheKey, res);
      setAnswer(res.answer);
      setSources(res.sources);
      setUncertainty(res.uncertainty);
      setQuery("");
      requestAnimationFrame(() => {
        answerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Question failed. Try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    await handleAsk(trimmed);
  }

  const isInline = variant === "inline";

  return (
    <section
      className={cn(
        isInline
          ? "rounded-sm border border-rule bg-surface-elevated"
          : "flex h-full flex-col bg-paper",
      )}
    >
      <div
        className={cn(
          "flex w-full items-center justify-between px-4 py-3",
          isInline && !alwaysExpanded && "border-b border-rule",
        )}
      >
        <span className="text-sm font-medium text-ink">
          {multiPaper ? "Ask about these studies" : "Ask a follow-up"}
        </span>
        {isInline && !alwaysExpanded && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-ink-faint hover:text-ink"
          >
            {expanded ? "Hide" : "Show"}
          </button>
        )}
      </div>

      {isOpen && (
        <>
          {showScopeToggle && (onUseCompared || onUseTopResults) && (
            <div className="flex flex-wrap gap-1.5 border-t border-rule px-4 py-2">
              {onUseCompared && (
                <button
                  type="button"
                  onClick={onUseCompared}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    activeScope === "compared"
                      ? "bg-accent text-paper"
                      : "text-ink-muted hover:bg-paper",
                  )}
                >
                  Compared
                </button>
              )}
              {onUseTopResults && (
                <button
                  type="button"
                  onClick={onUseTopResults}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    activeScope === "top"
                      ? "bg-accent text-paper"
                      : "text-ink-muted hover:bg-paper",
                  )}
                >
                  Top results
                </button>
              )}
            </div>
          )}

          <div className={cn("px-4 py-3", !isInline && "flex-1 overflow-y-auto")}>
            {error && <p className="mb-2 text-sm text-danger">{error}</p>}

            {loading ? (
              <div className="space-y-2">
                <p className="text-xs text-ink-faint">Reading the studies…</p>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : answer ? (
              <div ref={answerRef} className="space-y-2">
                <p className="text-sm leading-relaxed text-ink">{answer}</p>
                {uncertainty && <p className="text-xs text-ink-muted">{uncertainty}</p>}
                {sources.length > 0 && (
                  <ul className="space-y-1">
                    {sources.map((s) => (
                      <li key={s.paperId}>
                        <Link
                          href={`/paper/${s.paperId}`}
                          className="text-xs font-medium text-accent hover:text-accent-hover"
                        >
                          {s.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAnswer(null);
                    setSources([]);
                    setUncertainty(null);
                    setError(null);
                  }}
                  className="text-xs font-medium text-accent hover:text-accent-hover"
                >
                  Ask another
                </button>
              </div>
            ) : (
              availableSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {availableSuggestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => askSuggested(q)}
                      className="rounded-full border border-rule bg-paper px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-accent-muted hover:text-ink"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className={cn("border-t border-rule p-3", isInline && "rounded-b-sm bg-paper")}
          >
            <div className="flex gap-2">
              <Input
                aria-label={multiPaper ? "Ask a question about these studies" : "Ask a question about this study"}
                placeholder={multiPaper ? "Ask about these studies…" : "Your question…"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={paperIds.length === 0 || loading}
                className="h-9 flex-1 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading || paperIds.length === 0 || !query.trim()}
              >
                {loading ? "…" : "Ask"}
              </Button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
