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

Extract structured information from the paper text.

plain_summary = how you'd explain this study to a smart friend who is not a scientist:
- First sentence = what the study found, in plain words. Lead with the result, not the setup.
- 2-4 short sentences, roughly an 8th-grade reading level. No jargon; spell out any acronym the first time you use it.
- If the study is small, preliminary, or only shows a correlation (not cause), say so in plain words.

findings = the concrete results, each as ONE plain sentence with a number or direction where the paper gives one. Not descriptions of the method.

Never write these filler phrases: "studies suggest", "research shows", "it is important to note", "plays a vital/crucial/valuable role", "more research is needed", "further research is needed". Give no medical advice.

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
