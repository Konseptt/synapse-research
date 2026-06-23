import { z } from "zod";

import { chatCompletion } from "@/lib/ai/providers/nvidia";

export const searchOverviewSchema = z.object({
  summary: z.string(),
  verdict: z.enum(["supports", "mixed", "contradictory", "insufficient"]),
  verdict_label: z.string(),
  uncertainty: z.string().nullable(),
});

export type SearchOverviewOutput = z.infer<typeof searchOverviewSchema>;

export interface OverviewPaperInput {
  index: number;
  title: string;
  abstract: string | null;
  plainSummary: string | null;
  findings: string[] | null;
  journal: string | null;
  year: string | null;
}

const SYSTEM_PROMPT = `You answer a health or science question for a curious non-expert, using ONLY the studies provided.

Write the summary the way you'd explain it to a smart friend who is not a scientist:
- First sentence = the direct answer to their question. Lead with it.
- Everyday words, short sentences, roughly an 8th-grade reading level.
- 2-3 sentences total. Cite studies inline as [1], [2].
- If the studies are few, small, or disagree, say that plainly in a few words.

Banned (do NOT write these): "studies suggest", "research shows", "it is important to note", "plays a vital/valuable/crucial role", "more research is needed", "further research is needed", "remains uncertain" as a throat-clearing ending. Do not repeat the question back. Do not give medical advice. Do not tell the reader to read more or scroll; the app handles that.

Return ONLY valid JSON, no markdown fences:
{"summary":"2-3 plain sentences, answer first, with [n] citations","verdict":"supports|mixed|contradictory|insufficient","verdict_label":"plain label, 2-4 words, e.g. 'Likely helps', 'Mixed so far', 'Too early to tell'","uncertainty":"one short plain sentence naming the biggest catch, or null"}`;

function parseJsonResponse(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object in model response");
    return JSON.parse(match[0]);
  }
}

function normalizeVerdict(value: unknown): string {
  if (typeof value !== "string") return "insufficient";
  const v = value.toLowerCase().trim();
  if (["supports", "mixed", "contradictory", "insufficient"].includes(v)) return v;
  if (["positive", "support", "supported", "yes", "beneficial"].includes(v)) return "supports";
  if (["negative", "contradicts", "no", "harmful"].includes(v)) return "contradictory";
  if (["unclear", "inconclusive", "unknown", "limited"].includes(v)) return "insufficient";
  return "mixed";
}

function coerceOverviewPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  const verdict = normalizeVerdict(obj.verdict);
  const mapped: Record<string, unknown> = { ...obj, verdict };
  if (!mapped.verdict_label && typeof mapped.verdictLabel === "string") {
    mapped.verdict_label = mapped.verdictLabel;
  }
  if (typeof mapped.verdict_label !== "string" || !mapped.verdict_label.trim()) {
    mapped.verdict_label =
      verdict === "supports"
        ? "Evidence supports"
        : verdict === "contradictory"
          ? "Evidence is contradictory"
          : verdict === "mixed"
            ? "Evidence is mixed"
            : "Insufficient evidence";
  }
  return mapped;
}

async function callOverviewModel(
  query: string,
  context: string,
  jsonMode: boolean,
): Promise<string> {
  return chatCompletion(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Question: ${query}\n\nStudies:\n${context}` },
    ],
    { jsonMode, maxTokens: 400, temperature: 0.1 },
  );
}

function withCallTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("NVIDIA call timed out")), ms);
    }),
  ]);
}

const NVIDIA_CALL_TIMEOUT_MS = 52_000;

export async function synthesizeSearchOverview(
  query: string,
  papers: OverviewPaperInput[],
): Promise<SearchOverviewOutput> {
  const context = papers
    .map((p) => {
      const parts = [`[${p.index}] ${p.title}`];
      if (p.plainSummary) parts.push(`Summary: ${p.plainSummary.slice(0, 200)}`);
      else if (p.findings?.length) parts.push(`Findings: ${p.findings.slice(0, 2).join("; ")}`);
      else if (p.abstract) parts.push(`Abstract: ${p.abstract.slice(0, 250)}`);
      return parts.join("\n");
    })
    .join("\n\n")
    .slice(0, 2800);

  let lastError: Error | null = null;

  for (const jsonMode of [true, false]) {
    try {
      const raw = await withCallTimeout(
        callOverviewModel(query, context, jsonMode),
        NVIDIA_CALL_TIMEOUT_MS,
      );
      const parsed = coerceOverviewPayload(parseJsonResponse(raw));
      return searchOverviewSchema.parse(parsed);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Overview synthesis failed");
      // If NVIDIA timed out, a second identical-sized call will likely time out too.
      if (lastError.message.includes("timed out")) break;
    }
  }

  throw lastError ?? new Error("Overview synthesis failed");
}
