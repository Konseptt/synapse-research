"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getTopicGraph } from "@/lib/api/client";

const GraphCanvas = dynamic(
  () => import("@/features/graph/graph-canvas").then((m) => m.GraphCanvas),
  { ssr: false, loading: () => <Skeleton className="absolute inset-0 rounded-none" /> },
);

export default function GraphPage() {
  const [topic, setTopic] = useState("depression");
  const [searchTopic, setSearchTopic] = useState("depression");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q?.trim()) {
      setTopic(q.trim());
      setSearchTopic(q.trim());
    }
  }, []);

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
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buildGraph()}
          placeholder="Topic, e.g. sleep and mental health"
          className="max-w-xl flex-1"
        />
        <Button onClick={buildGraph}>Build graph</Button>
        <Link
          href={`/search?q=${encodeURIComponent(searchTopic)}`}
          className="text-xs font-medium text-accent hover:text-accent-hover"
        >
          Open search overview
        </Link>
        {data && !isLoading && (
          <p className="ml-auto font-mono text-[0.6875rem] uppercase tracking-wider text-ink-faint">
            {data.nodes.length} nodes · {data.edges.length} edges
          </p>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        {isLoading ? (
          <Skeleton className="absolute inset-0 rounded-none" />
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-danger">
              {error instanceof Error ? error.message : "Could not load graph"}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : data && data.nodes.length > 1 ? (
          <>
            <GraphCanvas
              nodes={data.nodes}
              edges={data.edges}
              layout={data.layout}
              className="absolute inset-0"
            />
            <p className="pointer-events-none absolute bottom-4 left-4 rounded-sm bg-paper/90 px-3 py-2 text-xs text-ink-muted shadow-sm">
              Click a study node to open it. Orange edges mark contradictions.
            </p>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm text-ink-muted">No studies found for that topic.</p>
            <Link href="/search" className="text-sm font-medium text-accent hover:text-accent-hover">
              Try search instead
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
