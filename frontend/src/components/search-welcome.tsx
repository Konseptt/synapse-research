"use client";

import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { RerExplainer } from "@/components/rer-explainer";
import { SearchBox } from "@/components/search-box";

interface SearchWelcomeProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
}

export function SearchWelcome({ query, onQueryChange, onSearch }: SearchWelcomeProps) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-center lg:py-24">
      <p className="label-caps mb-3">Search</p>
      <h1 className="font-serif text-3xl font-medium text-ink lg:text-4xl">
        What do you want to know?
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
        Ask naturally. Results are ranked by our custom Research Evidence Rank (RER): study
        design, sample size, and how well each paper matches your question.
      </p>

      <div className="mx-auto mt-8 max-w-lg text-left">
        <SearchBox value={query} onChange={onQueryChange} onSearch={onSearch} autoFocus />
      </div>

      <RerExplainer className="mx-auto mt-10 max-w-lg" compact />

      <MedicalDisclaimer className="mx-auto mt-10 max-w-md text-left text-xs" />
    </div>
  );
}
