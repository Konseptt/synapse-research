"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getTopicGraph } from "@/lib/api/client";

const GraphCanvas = dynamic(
  () => import("@/features/graph/graph-canvas").then((m) => m.GraphCanvas),
  { ssr: false, loading: () => <Skeleton className="absolute inset-0 rounded-none" /> },
);

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
      }
    >
      <GraphPageContent />
    </Suspense>
  );
}

function GraphPageContent() {
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get("q")?.trim() || "depression";
  const [topic, setTopic] = useState(initialTopic);
  const [searchTopic, setSearchTopic] = useState(initialTopic);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["graph", searchTopic],
    queryFn: () => getTopicGraph(searchTopic),
    retry: 2,
  });

  const buildGraph = () => setSearchTopic(topic.trim() || "depression");

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 w-full flex-col overflow-hidden bg-surface-elevated">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-rule bg-paper px-5 py-3 lg:px-8">
        <Input
          aria-label="Topic to build graph for"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buildGraph()}
          placeholder="Topic, e.g. sleep and mental health"
          className="max-w-xl flex-1"
        />
        <Button onClick={buildGraph}>Build graph</Button>
        <Link
          href={`/search?q=${encodeURIComponent(searchTopic)}`}
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          Search this topic →
        </Link>
      </div>

      <div className="relative min-h-0 flex-1">
        {isLoading && <Skeleton className="absolute inset-0 rounded-none" />}
        {isError && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-danger">
              {error instanceof Error ? error.message : "Could not build graph."}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
        {data && !isError && (
          <GraphCanvas
            nodes={data.nodes}
            edges={data.edges}
            layout={data.layout}
            className="absolute inset-0"
          />
        )}
      </div>
    </div>
  );
}
