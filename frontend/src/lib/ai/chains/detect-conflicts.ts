import { z } from "zod";

import { chatCompletion } from "@/lib/ai/providers/nvidia";

export const conflictSchema = z.object({
  agreement: z.boolean(),
  reason: z.string(),
});

export type ConflictOutput = z.infer<typeof conflictSchema>;

export async function detectConflicts(
  summaryA: string,
  summaryB: string,
): Promise<ConflictOutput> {
  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          'Compare two paper findings. Return JSON: {"agreement": boolean, "reason": string}. Explain scientific disagreement if any.',
      },
      {
        role: "user",
        content: `Paper A:\n${summaryA}\n\nPaper B:\n${summaryB}`,
      },
    ],
    { jsonMode: true },
  );

  return conflictSchema.parse(JSON.parse(raw));
}
