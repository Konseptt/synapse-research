"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import type { SearchFilters } from "@/types/paper";

interface SearchFiltersProps {
  filters: SearchFilters;
  onChange: (filters: Partial<SearchFilters>) => void;
}

export function SearchFiltersPanel({ filters, onChange }: SearchFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="search-filters-content"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="label-caps">Filters</span>
        <span className="text-xs text-ink-faint">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div id="search-filters-content" className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              aria-label="Year from"
              placeholder="Year from"
              type="number"
              value={filters.yearFrom ?? ""}
              onChange={(e) =>
                onChange({ yearFrom: e.target.value ? Number(e.target.value) : undefined })
              }
            />
            <Input
              aria-label="Year to"
              placeholder="Year to"
              type="number"
              value={filters.yearTo ?? ""}
              onChange={(e) =>
                onChange({ yearTo: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
          <Input
            aria-label="Journal name contains"
            placeholder="Journal contains…"
            value={filters.journal ?? ""}
            onChange={(e) => onChange({ journal: e.target.value || undefined })}
          />
          <Input
            aria-label="Study type"
            placeholder="Study type (e.g. RCT, meta-analysis, clinical trial)"
            value={filters.studyType ?? ""}
            onChange={(e) => onChange({ studyType: e.target.value || undefined })}
          />
        </div>
      )}
    </div>
  );
}
