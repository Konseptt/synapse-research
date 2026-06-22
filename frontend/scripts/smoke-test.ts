/**
 * End-to-end smoke test against a running dev server (default :3001).
 * Usage: npm run dev &  &&  npm run test:smoke
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3001";
const QUERY = "Flu shot: worth it?";

function fail(msg: string): never {
  console.error("FAIL:", msg);
  process.exit(1);
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    fail(`${path} returned ${res.status}: ${JSON.stringify(body)}`);
  }
  return body as T;
}

async function main() {
  console.log("Smoke test →", BASE);
  const t0 = Date.now();

  const health = await fetchJson<{ status: string; db: string; ai: string }>("/api/health");
  if (health.status !== "ok") fail("health not ok");
  if (health.db !== "ok") fail("database not ok");
  console.log("✓ health");

  const searchStart = Date.now();
  const search = await fetchJson<{
    total: number;
    searchedAs?: string;
    papers: { id: string; title: string }[];
    overview?: { summary: string; generatedBy?: string };
  }>(`/api/papers/search?q=${encodeURIComponent(QUERY)}`);
  const searchMs = Date.now() - searchStart;

  if (search.total < 1 || search.papers.length < 1) {
    fail(`search returned no papers for "${QUERY}"`);
  }
  if (!search.searchedAs?.includes("influenza")) {
    fail(`expected topic translation, got searchedAs=${search.searchedAs}`);
  }
  if (!search.overview?.summary?.includes("[")) {
    fail("search should include instant heuristic overview with citations");
  }
  console.log("✓ search", search.total, "papers in", searchMs, "ms, overview:", search.overview?.generatedBy);

  const paperIds = search.papers.slice(0, 3).map((p) => p.id);

  const search2Start = Date.now();
  await fetchJson(`/api/papers/search?q=${encodeURIComponent(QUERY)}`);
  const search2Ms = Date.now() - search2Start;
  console.log("✓ cached search repeat in", search2Ms, "ms");

  const chatStart = Date.now();
  const chat = await fetchJson<{ answer: string }>("/api/chat/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "What do these studies say about flu vaccine effectiveness?",
      paperIds: [paperIds[0]],
    }),
  });
  const chatMs = Date.now() - chatStart;
  if (!chat.answer?.trim()) fail("chat missing answer");
  console.log("✓ chat", chatMs, "ms");

  const chat2Start = Date.now();
  await fetchJson("/api/chat/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "What do these studies say about flu vaccine effectiveness?",
      paperIds: [paperIds[0]],
    }),
  });
  const chat2Ms = Date.now() - chat2Start;
  console.log("✓ cached chat repeat in", chat2Ms, "ms");

  console.log("\nAll smoke checks passed in", Date.now() - t0, "ms");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
