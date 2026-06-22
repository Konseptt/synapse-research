"use client";

import { useMemo, useState } from "react";

import {
  POPULAR_TOPICS,
  TOPIC_CATEGORIES,
  type TopicCategory,
} from "@/lib/content/public-topics";
import { cn } from "@/lib/utils";

interface PopularTopicsProps {
  onSelect: (query: string) => void;
  className?: string;
  showDescriptions?: boolean;
  categorized?: boolean;
  /** Hide each topic after the user clicks it */
  hideAfterSelect?: boolean;
}

export function PopularTopics({
  onSelect,
  className,
  showDescriptions = false,
  categorized = false,
  hideAfterSelect = true,
}: PopularTopicsProps) {
  const [category, setCategory] = useState<TopicCategory>("all");
  const [usedQueries, setUsedQueries] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    let list = categorized && category !== "all"
      ? POPULAR_TOPICS.filter((t) => t.category === category)
      : POPULAR_TOPICS;

    if (hideAfterSelect) {
      list = list.filter((t) => !usedQueries.has(t.query));
    }

    return list;
  }, [category, categorized, hideAfterSelect, usedQueries]);

  function handleSelect(topic: (typeof POPULAR_TOPICS)[number]) {
    if (hideAfterSelect) {
      setUsedQueries((prev) => new Set(prev).add(topic.query));
    }
    onSelect(topic.label);
  }

  if (visible.length === 0 && hideAfterSelect && usedQueries.size > 0) {
    return (
      <p className={cn("text-xs text-ink-faint", className)}>
        Pick a question above or type your own in the search box.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {categorized && (
        <div className="flex flex-wrap gap-1.5">
          {TOPIC_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={cn(
                "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                category === cat.id
                  ? "bg-accent text-surface-elevated"
                  : "bg-surface-elevated text-ink-muted hover:bg-paper hover:text-ink",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {visible.map((topic) => (
          <button
            key={topic.query}
            type="button"
            onClick={() => handleSelect(topic)}
            title={topic.description ?? topic.query}
            className="rounded-sm border border-rule bg-surface-elevated px-3 py-1.5 text-left text-sm text-ink transition-colors hover:border-accent-muted hover:bg-accent-soft/40"
          >
            {topic.label}
          </button>
        ))}
      </div>

      {showDescriptions && visible.length > 0 && (
        <p className="text-xs text-ink-faint">
          Tap a question to search. Used questions disappear so you can focus.
        </p>
      )}
    </div>
  );
}
