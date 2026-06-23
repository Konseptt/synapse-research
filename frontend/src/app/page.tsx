"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { RerExplainer } from "@/components/rer-explainer";
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
          <p className="label-caps mb-4">Free. No account needed.</p>
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Health questions, answered from real studies
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-ink-muted">
            Ask in plain English. Every result is ranked by our custom Research Evidence Rank
            (RER): study design, sample size, and relevance, scored 0–100.
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

      <section className="px-5 py-12 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <RerExplainer />
        </div>
      </section>
    </div>
  );
}
