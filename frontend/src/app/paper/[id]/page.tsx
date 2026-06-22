"use client";

import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { ScoreBadge } from "@/components/score-badge";
import { PaperAnalysisSection } from "@/features/papers/paper-analysis-section";
import { PaperMetadata } from "@/features/papers/paper-metadata";
import { useAnalyzePaper } from "@/hooks/use-analyze-paper";
import { usePaperQuery } from "@/hooks/use-paper-query";
import { decodeHtmlEntities, isAnalysisReady } from "@/lib/analysis-utils";
import { getEvidence } from "@/lib/api/client";
import { formatApaCitation, formatRisRecord } from "@/lib/citations/format-citation";
import { useQuery } from "@tanstack/react-query";

export default function PaperPage() {
  const params = useParams();
  const id = params.id as string;

  const {
    data: paper,
    isLoading,
    isError,
    error,
    refetch,
  } = usePaperQuery(id);

  const analyze = useAnalyzePaper(id);
  const analysisReady = isAnalysisReady(paper?.analysis);

  const { data: evidence } = useQuery({
    queryKey: ["evidence", id],
    queryFn: () => getEvidence(id),
    enabled: analysisReady,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8 lg:p-12">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-8 lg:p-12">
        <p className="text-sm text-danger">
          Failed to load paper: {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!paper) {
    return <div className="p-8 text-sm text-ink-muted">Paper not found.</div>;
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-surface">
      <div className="mx-auto max-w-3xl px-5 py-10 lg:px-8 lg:py-14">
        <header className="mb-10 border-b border-rule pb-8">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h1 className="font-serif text-2xl font-medium leading-tight text-ink lg:text-3xl">
              {decodeHtmlEntities(paper.title)}
            </h1>
            {paper.evidenceScore != null && <ScoreBadge score={paper.evidenceScore} showLabel />}
          </div>
          {paper.journal && (
            <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-faint">
              {paper.journal}
              {paper.publicationDate ? ` · ${paper.publicationDate.slice(0, 10)}` : ""}
            </p>
          )}
          <div className="mt-3">
            <PaperMetadata paper={paper} showCopyCitation />
          </div>
          {paper.authors && (
            <p className="mt-3 text-sm text-ink-muted">
              {paper.authors.map(decodeHtmlEntities).join(", ")}
            </p>
          )}
        </header>

        <PaperAnalysisSection
          paper={paper}
          paperId={id}
          onAnalyze={(force) => analyze.mutate(force)}
          analyzing={analyze.isPending}
          analyzeError={analyze.error?.message ?? null}
        />

        <Tabs defaultValue="overview" className="mt-10">
          <TabsList>
            <TabsTrigger value="overview">Summary</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="methods">Methods</TabsTrigger>
            <TabsTrigger value="citations">Citation</TabsTrigger>
            <TabsTrigger value="discussion">Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-5 text-sm leading-relaxed">
              <div>
                <p className="label-caps mb-2">Abstract</p>
                <p className="border-l-2 border-rule pl-4 text-ink-muted">
                  {paper.abstract ? decodeHtmlEntities(paper.abstract) : "No abstract available."}
                </p>
              </div>
              {paper.analysis?.findings?.map((f, i) => (
                <p key={i} className="border-t border-rule/60 pt-3 text-ink-muted">
                  {f}
                </p>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="evidence">
            {evidence ? (
              <div className="space-y-4 text-sm">
                <p className="font-serif text-4xl font-medium text-accent">
                  {Math.round(evidence.score)}
                  <span className="text-lg text-ink-faint">/100</span>
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border border-rule bg-surface-elevated p-4">
                  <dt className="text-ink-faint">Study type</dt>
                  <dd className="font-mono text-ink">+{evidence.studyTypeScore}</dd>
                  <dt className="text-ink-faint">Sample size</dt>
                  <dd className="font-mono text-ink">+{evidence.sampleSizeScore}</dd>
                  <dt className="text-ink-faint">Recency</dt>
                  <dd className="font-mono text-ink">+{evidence.recencyScore}</dd>
                  <dt className="text-ink-faint">Quality</dt>
                  <dd className="font-mono text-ink">
                    {evidence.biasScore >= 0 ? "+" : ""}
                    {evidence.biasScore}
                  </dd>
                </dl>
                {evidence.reasoning && (
                  <p className="leading-relaxed text-ink-muted">{evidence.reasoning}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Run analysis to generate an evidence score.</p>
            )}
          </TabsContent>

          <TabsContent value="methods">
            <div className="space-y-3 text-sm leading-relaxed text-ink-muted">
              {paper.analysis?.methodology && <p>{paper.analysis.methodology}</p>}
              {paper.analysis?.sampleSize && (
                <p>
                  <span className="font-medium text-ink">Sample size · </span>
                  {paper.analysis.sampleSize}
                </p>
              )}
              {paper.analysis?.population && (
                <p>
                  <span className="font-medium text-ink">Population · </span>
                  {paper.analysis.population}
                </p>
              )}
              {!paper.analysis?.methodology && (
                <p className="text-ink-muted">No methods extracted yet.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="citations">
            <div className="space-y-4 text-sm">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-sm border border-rule bg-surface-elevated p-4 font-mono text-xs text-ink-muted">
                {formatApaCitation(paper)}
              </pre>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(formatApaCitation(paper))}
                >
                  Copy APA
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const blob = new Blob([formatRisRecord(paper)], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "paper.ris";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download RIS
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="discussion">
            <div className="space-y-3 text-sm leading-relaxed text-ink-muted">
              {paper.analysis?.limitations && <p>{paper.analysis.limitations}</p>}
              {paper.analysis?.results && <p>{paper.analysis.results}</p>}
              {!paper.analysis?.limitations && !paper.analysis?.results && (
                <p className="text-ink-muted">No limitations extracted yet.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <MedicalDisclaimer className="mt-10" />
      </div>
    </div>
  );
}
