"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEARCH_PLACEHOLDERS } from "@/lib/content/public-topics";
import { expandSearchQuery, getSearchSuggestions } from "@/lib/search/query-helper";
import { cn } from "@/lib/utils";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  className?: string;
  inputClassName?: string;
  showSuggestions?: boolean;
  autoFocus?: boolean;
}

export function SearchBox({
  value,
  onChange,
  onSearch,
  className,
  inputClassName,
  showSuggestions = true,
  autoFocus,
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const suggestions = showSuggestions && value.trim().length > 0
    ? getSearchSuggestions(value, 6)
    : [];

  const preview = value.trim().length > 2 ? expandSearchQuery(value) : null;

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % SEARCH_PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  function submit(query = value) {
    const trimmed = query.trim();
    if (trimmed.length <= 2) return;
    setOpen(false);
    onSearch(trimmed);
  }

  function pickSuggestion(label: string) {
    onChange(label);
    submit(label);
  }

  return (
    <div className={cn("relative flex flex-1 flex-col gap-1", className)}>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          autoFocus={autoFocus}
          placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setOpen(false);
          }}
          className={cn("flex-1", inputClassName)}
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
        />
        <Button onClick={() => submit()} disabled={value.trim().length <= 2}>
          Search
        </Button>
      </div>

      {preview?.translatedFrom && preview.searchQuery !== preview.originalQuery && (
        <p className="text-xs text-ink-faint">
          We&apos;ll search studies for:{" "}
          <span className="font-medium text-ink-muted">&ldquo;{preview.searchQuery}&rdquo;</span>
        </p>
      )}

      {open && suggestions.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto border border-rule bg-surface-elevated py-1 shadow-sm"
          role="listbox"
        >
          {suggestions.map((topic) => (
            <li key={topic.query}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="w-full px-3 py-2 text-left hover:bg-accent-soft/50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(topic.label)}
              >
                <span className="block text-sm text-ink">{topic.label}</span>
                {topic.description && (
                  <span className="block text-xs text-ink-faint">{topic.description}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
