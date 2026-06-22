import { z } from "zod";

import { chatCompletion } from "@/lib/ai/providers/nvidia";

export const extractEvidenceSchema = z.object({
  research_question: z.string().nullable(),
  methodology: z.string().nullable(),
  sample_size: z.string().nullable(),
  population: z.string().nullable(),
  results: z.string().nullable(),
  limitations: z.string().nullable(),
  confidence_score: z.number().nullable(),
  findings: z.array(z.string()).nullable(),
});

export type ExtractEvidenceOutput = z.infer<typeof extractEvidenceSchema>;

export async function extractEvidence(text: string): Promise<ExtractEvidenceOutput> {
  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          "Extract evidence fields from biomedical paper text. Return JSON only. Use null if unknown.",
      },
      { role: "user", content: text.slice(0, 12000) },
    ],
    { jsonMode: true },
  );

  return extractEvidenceSchema.parse(JSON.parse(raw));
}
