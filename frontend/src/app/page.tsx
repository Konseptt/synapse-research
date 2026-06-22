"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { PopularTopics } from "@/components/popular-topics";
import { SearchBox } from "@/components/search-box";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function goToSearch(q: string) {
    const trimmed = q.trim();
    if (trimmed.length <= 2) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-surface">
      <section className="border-b border-rule bg-paper">
        <div className="mx-auto max-w-2xl px-5 py-16 text-center lg:py-24">
          <p className="label-caps mb-4">Free · No account needed</p>
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Health questions, answered from real studies
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-ink-muted">
            Ask in plain English. Get an overview, browse matching papers, and dig into any study.
          </p>

          <div className="mx-auto mt-8 max-w-lg text-left">
            <SearchBox
              value={query}
              onChange={setQuery}
              onSearch={goToSearch}
              showSuggestions
              autoFocus
            />
          </div>

          <MedicalDisclaimer className="mx-auto mt-8 max-w-md text-left text-xs" />
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="mx-auto max-w-2xl">
          <p className="label-caps mb-4 text-center">Try a question</p>
          <PopularTopics onSelect={goToSearch} categorized showDescriptions hideAfterSelect />
        </div>
      </section>
    </div>
  );
}
