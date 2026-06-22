import type {
  CompareResponse,
  ConflictPairResult,
  EvidenceScore,
  GraphResponse,
  PaperDetail,
  PaperSummary,
  ResearchChatResponse,
  SearchOverviewResponse,
} from "@/types/paper";
import { fetchJson } from "@/lib/fetch-json";

export async function searchPapers(
  query: string,
  filters?: Record<string, string | number | undefined>,
): Promise<{
  query: string;
  searchedAs?: string;
  searchHint?: string | null;
  translatedFrom?: string | null;
  total: number;
  papers: PaperSummary[];
  overview?: SearchOverviewResponse;
  aiOverviewCached?: boolean;
}> {
  const q = (query ?? "").trim();
  if (!q) {
    return { query: "", total: 0, papers: [] };
  }

  const params = new URLSearchParams({ q });
  if (filters?.yearFrom) params.set("yearFrom", String(filters.yearFrom));
  if (filters?.yearTo) params.set("yearTo", String(filters.yearTo));
  if (filters?.journal) params.set("journal", String(filters.journal));
  if (filters?.studyType) params.set("studyType", String(filters.studyType));
  return fetchJson(`/api/papers/search?${params}`, { timeoutMs: 45_000, retries: 1 });
}

export async function getPaper(id: string): Promise<PaperDetail> {
  return fetchJson(`/api/papers/${id}`, { timeoutMs: 15_000, retries: 2 });
}

export async function analyzePaper(
  id: string,
  force = false,
): Promise<{ paperId: string; status: string }> {
  const url = force ? `/api/papers/${id}/analyze?force=true` : `/api/papers/${id}/analyze`;
  return fetchJson(url, { method: "POST", timeoutMs: 30_000, retries: 0 });
}

export async function getEvidence(id: string): Promise<EvidenceScore> {
  return fetchJson(`/api/papers/${id}/evidence`, { timeoutMs: 15_000, retries: 1 });
}

export async function researchChat(
  query: string,
  paperIds: string[],
): Promise<ResearchChatResponse> {
  return fetchJson("/api/chat/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, paperIds }),
    timeoutMs: 120_000,
    retries: 0,
  });
}

export async function getTopicGraph(topic: string): Promise<GraphResponse> {
  return fetchJson(`/api/graph/topic/${encodeURIComponent(topic)}`, { timeoutMs: 20_000, retries: 1 });
}

export async function uploadPaper(
  file: File,
): Promise<{ id: string; title: string; status: string }> {
  const form = new FormData();
  form.append("file", file);
  return fetchJson("/api/papers/upload", {
    method: "POST",
    body: form,
    timeoutMs: 60_000,
    retries: 0,
  });
}

export async function getHealth(): Promise<{ status: string; db?: string }> {
  return fetchJson("/api/health", { timeoutMs: 10_000, retries: 1 });
}

export async function comparePapers(ids: string[]): Promise<CompareResponse> {
  const params = new URLSearchParams({ ids: ids.join(",") });
  return fetchJson(`/api/papers/compare?${params}`, { timeoutMs: 20_000, retries: 1 });
}

export async function detectConflicts(paperIds: string[]): Promise<{ pairs: ConflictPairResult[] }> {
  return fetchJson("/api/papers/conflicts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paperIds }),
    timeoutMs: 120_000,
    retries: 0,
  });
}

export async function getSearchOverview(
  query: string,
  paperIds: string[],
  forceAi = false,
): Promise<SearchOverviewResponse> {
  const params = forceAi ? "?force=true" : "";
  return fetchJson(`/api/papers/overview${params}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, paperIds: paperIds.slice(0, 8) }),
    timeoutMs: 90_000,
    retries: 0,
  });
}
