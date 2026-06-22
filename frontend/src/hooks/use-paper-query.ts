"use client";

import { useQuery } from "@tanstack/react-query";

import { getPaper } from "@/lib/api/client";
import { isAnalysisPending } from "@/lib/analysis-utils";

/** Stop polling after ~5 minutes; UI should offer retry. */
const MAX_POLLS = 90;

export function usePaperQuery(paperId: string | null) {
  return useQuery({
    queryKey: ["paper", paperId],
    queryFn: () => getPaper(paperId!),
    enabled: !!paperId,
    retry: 2,
    refetchInterval: (query) => {
      const status = query.state.data?.analysis?.status;
      if (!isAnalysisPending(query.state.data?.analysis) && status !== "queued") {
        return false;
      }
      if (query.state.dataUpdateCount >= MAX_POLLS) return false;
      return query.state.dataUpdateCount > 30 ? 5000 : 2000;
    },
  });
}
