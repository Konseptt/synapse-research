"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { analyzePaper as analyzePaperApi } from "@/lib/api/client";

export function useAnalyzePaper(paperId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<
    { paperId: string; status: string },
    Error,
    boolean | undefined
  >({
    mutationFn: async (force = false) => {
      if (!paperId) throw new Error("No paper selected");
      return analyzePaperApi(paperId, force);
    },
    onSuccess: () => {
      if (!paperId) return;
      queryClient.invalidateQueries({ queryKey: ["paper", paperId] });
      queryClient.invalidateQueries({ queryKey: ["evidence", paperId] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      void queryClient.refetchQueries({ queryKey: ["paper", paperId] });
    },
  });
}
