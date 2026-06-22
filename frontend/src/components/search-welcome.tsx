"use client";

import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { PopularTopics } from "@/components/popular-topics";
import { SearchBox } from "@/components/search-box";

interface SearchWelcomeProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  onSelectTopic: (query: string) => void;
}

export function SearchWelcome({
  query,
  onQueryChange,
  onSearch,
  onSelectTopic,
}: SearchWelcomeProps) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-center lg:py-24">
      <p className="label-caps mb-3">Search</p>
      <h1 className="font-serif text-3xl font-medium text-ink lg:text-4xl">
        What do you want to know?
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
        Ask naturally, like &ldquo;Is coffee bad?&rdquo; or &ldquo;Does exercise help depression?&rdquo;
      </p>

      <div className="mx-auto mt-8 max-w-lg text-left">
        <SearchBox value={query} onChange={onQueryChange} onSearch={onSearch} autoFocus />
      </div>

      <div className="mx-auto mt-10 max-w-lg text-left">
        <PopularTopics onSelect={onSelectTopic} hideAfterSelect />
      </div>

      <MedicalDisclaimer className="mx-auto mt-10 max-w-md text-left text-xs" />
    </div>
  );
}
