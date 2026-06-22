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

const SYSTEM_PROMPT = `You write a short research overview for a health/science question.
Use ONLY the provided studies. Cite with [1], [2] in the summary.
Return ONLY valid JSON, no markdown fences:
{"summary":"2-3 plain English sentences with [n] citations","verdict":"supports|mixed|contradictory|insufficient","verdict_label":"short label","uncertainty":"one sentence or null"}
No medical advice.`;

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
