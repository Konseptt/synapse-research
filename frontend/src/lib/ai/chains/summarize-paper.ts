import { z } from "zod";

import { chatCompletion } from "@/lib/ai/providers/nvidia";

export const summarizePaperSchema = z.object({
  title: z.string().nullable(),
  research_question: z.string().nullable(),
  methodology: z.string().nullable(),
  sample_size: z.string().nullable(),
  participants: z.string().nullable(),
  findings: z.array(z.string()).nullable(),
  plain_summary: z.string().nullable(),
  limitations: z.array(z.string()).nullable(),
  conflict_of_interest: z.string().nullable(),
  funding: z.string().nullable(),
  confidence: z.number().nullable(),
});

export type SummarizePaperOutput = z.infer<typeof summarizePaperSchema>;

const SYSTEM_PROMPT = `You are a biomedical research analyst helping both scientists and everyday readers.

Extract structured information from paper text. Also write a plain_summary: 2-4 sentences a non-expert can understand (no jargon, no acronyms without explanation, no medical advice).

For conflict_of_interest and funding: extract only what is stated in the text (author disclosures, sponsor names, grant IDs). Use null if not mentioned. Do not invent.

Return ONLY valid JSON matching this schema:
{
  "title": string | null,
  "research_question": string | null,
  "methodology": string | null,
  "sample_size": string | null,
  "participants": string | null,
  "findings": string[] | null,
  "plain_summary": string | null,
  "limitations": string[] | null,
  "conflict_of_interest": string | null,
  "funding": string | null,
  "confidence": number | null
}
Use null for unknown fields. No markdown fences. No hallucinated data.`;

function parseJsonResponse(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object in model response");
    return JSON.parse(match[0]);
  }
}

export async function summarizePaper(text: string): Promise<SummarizePaperOutput> {
  if (!text.trim()) {
    throw new Error("No paper text to analyze");
  }

  const truncated = text.slice(0, 12000);
  const raw = await chatCompletion(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Analyze this paper text:\n\n${truncated}` },
    ],
    { jsonMode: true, maxTokens: 2048 },
  );

  return summarizePaperSchema.parse(parseJsonResponse(raw));
}
