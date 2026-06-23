import { eq, inArray, sql } from "drizzle-orm";

import { TTL, cacheKey, turboGetAsync, turboSetAsync } from "@/lib/cache/turbo-cache";
import { chatCompletion, embedText } from "@/lib/ai/providers/nvidia";
import { RESEARCH_SUMMARY_DISCLAIMER } from "@/lib/content/public-topics";
import { toPgVectorLiteral } from "@/lib/db/pgvector";
import { db } from "@/lib/db";
import { paperAnalyses, paperChunks, papers } from "@/lib/db/schema";
import { parseEmbedding, serializeEmbedding } from "@/lib/utils";
import type { CitationSource, ResearchChatResponse } from "@/types/paper";

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

async function retrieveChunksPgvector(
  query: string,
  paperIds: string[],
  topK: number,
): Promise<Array<{ paperId: string; content: string; title: string }>> {
  const queryEmbedding = await embedText(query, { inputType: "query" });
  const vecLiteral = toPgVectorLiteral(queryEmbedding);

  const rows = await db.execute<{
    paper_id: string;
    content: string;
    title: string;
  }>(sql`
    SELECT pc.paper_id, pc.content, p.title
    FROM paper_chunks pc
    INNER JOIN papers p ON p.id = pc.paper_id
    WHERE pc.paper_id IN (${sql.join(
      paperIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )})
      AND pc.embedding IS NOT NULL
    ORDER BY pc.embedding <=> ${vecLiteral}::vector
    LIMIT ${topK}
  `);

  return rows.map((r) => ({
    paperId: r.paper_id,
    content: r.content,
    title: r.title,
  }));
}

async function retrieveChunksLegacy(
  query: string,
  paperIds: string[],
  topK: number,
): Promise<Array<{ paperId: string; content: string; title: string }>> {
  const queryEmbedding = await embedText(query, { inputType: "query" });
  const chunks = await db
    .select({
      paperId: paperChunks.paperId,
      content: paperChunks.content,
      embedding: paperChunks.embeddingVector,
      title: papers.title,
    })
    .from(paperChunks)
    .innerJoin(papers, eq(paperChunks.paperId, papers.id))
    .where(inArray(paperChunks.paperId, paperIds));

  return chunks
    .map((c) => ({
      paperId: c.paperId,
      content: c.content,
      title: c.title,
      score: cosineSimilarity(queryEmbedding, parseEmbedding(c.embedding)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function retrieveChunks(
  query: string,
  paperIds: string[],
  topK = 8,
): Promise<Array<{ paperId: string; content: string; title: string }>> {
  if (paperIds.length === 0) return [];

  const stored = await db
    .select({ id: paperChunks.id, hasVector: paperChunks.embeddingVector })
    .from(paperChunks)
    .where(inArray(paperChunks.paperId, paperIds))
    .limit(1);

  if (stored.length === 0) return [];

  try {
    if (stored[0].hasVector && (await isPgvectorAvailable())) {
      return await retrieveChunksPgvector(query, paperIds, topK);
    }
  } catch (error) {
    console.warn("pgvector retrieval failed, using legacy:", error);
  }

  return retrieveChunksLegacy(query, paperIds, topK);
}

let pgvectorAvailable: boolean | null = null;

async function isPgvectorAvailable(): Promise<boolean> {
  if (pgvectorAvailable != null) return pgvectorAvailable;
  try {
    const ext = await db.execute(sql`
      SELECT 1 FROM pg_extension WHERE extname = 'vector' LIMIT 1
    `);
    const col = await db.execute(sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'paper_chunks' AND column_name = 'embedding'
      LIMIT 1
    `);
    pgvectorAvailable =
      Array.isArray(ext) && ext.length > 0 && Array.isArray(col) && col.length > 0;
  } catch {
    pgvectorAvailable = false;
  }
  return pgvectorAvailable;
}

async function buildPaperContext(
  paperIds: string[],
): Promise<Array<{ paperId: string; content: string; title: string }>> {
  const rows = await db
    .select({
      paperId: papers.id,
      title: papers.title,
      abstract: papers.abstract,
      plainSummary: paperAnalyses.plainSummary,
      findings: paperAnalyses.findings,
      methodology: paperAnalyses.methodology,
      limitations: paperAnalyses.limitations,
      researchQuestion: paperAnalyses.researchQuestion,
      conflictOfInterest: paperAnalyses.conflictOfInterest,
      funding: paperAnalyses.funding,
    })
    .from(papers)
    .leftJoin(paperAnalyses, eq(paperAnalyses.paperId, papers.id))
    .where(inArray(papers.id, paperIds));

  const chunks: Array<{ paperId: string; content: string; title: string }> = [];

  for (const row of rows) {
    const parts: string[] = [];
    if (row.plainSummary) parts.push(`Summary: ${row.plainSummary}`);
    if (row.researchQuestion) parts.push(`Research question: ${row.researchQuestion}`);
    if (row.findings?.length) parts.push(`Findings:\n- ${row.findings.join("\n- ")}`);
    if (row.methodology) parts.push(`Methods: ${row.methodology}`);
    if (row.limitations) parts.push(`Limitations: ${row.limitations}`);
    if (row.conflictOfInterest) parts.push(`Conflicts of interest: ${row.conflictOfInterest}`);
    if (row.funding) parts.push(`Funding: ${row.funding}`);
    if (row.abstract) parts.push(`Abstract: ${row.abstract.slice(0, 1200)}`);

    const content = parts.join("\n\n").slice(0, 2000);
    if (content.trim()) {
      chunks.push({ paperId: row.paperId, content, title: row.title });
    }
  }

  return chunks;
}

export async function researchChat(
  query: string,
  paperIds: string[],
): Promise<ResearchChatResponse> {
  const ck = cacheKey(["chat", query.toLowerCase().trim(), ...[...paperIds].sort()]);
  const cached = await turboGetAsync<ResearchChatResponse>(ck);
  if (cached) return cached;

  let chunks: Array<{ paperId: string; content: string; title: string }> = [];

  try {
    chunks = await retrieveChunks(query, paperIds);
  } catch (error) {
    console.warn("Vector retrieval failed, using paper text fallback:", error);
  }

  if (chunks.length === 0) {
    chunks = await buildPaperContext(paperIds);
  }

  if (chunks.length === 0) {
    return {
      answer: "No text available for these papers yet. Run analysis or upload PDFs first.",
      sources: [],
      uncertainty: "No abstract or analysis found.",
      disclaimer: RESEARCH_SUMMARY_DISCLAIMER,
    };
  }

  const multiPaper = paperIds.length > 1;
  const context = chunks
    .map((c, i) => `[${i + 1}] Paper: ${c.title}\n${c.content}`)
    .join("\n\n")
    .slice(0, 5000);

  const answer = await chatCompletion(
    [
      {
        role: "system",
        content: multiPaper
          ? "You answer a health or science question for a curious non-expert by comparing several studies. Lead with the direct answer in plain words, then say where the studies agree or disagree. Everyday language, short sentences, 3-6 total. Cite each study as [1], [2]. If the evidence is thin or mixed, say so plainly. Never write 'studies suggest', 'research shows', 'it is important to note', 'plays a vital/crucial role', or 'more/further research is needed'. No medical advice."
          : "You answer a health or science question for a curious non-expert, using only the provided study text. Lead with the direct answer in plain words. Everyday language, short sentences, 3-6 total. Cite the source as [1]. If the study does not really answer the question, say so plainly. Never write 'studies suggest', 'research shows', 'it is important to note', 'plays a vital/crucial role', or 'more/further research is needed'. No medical advice.",
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${query}`,
      },
    ],
    { maxTokens: 400, temperature: 0.2 },
  );

  const sources: CitationSource[] = chunks.map((c) => ({
    paperId: c.paperId,
    title: c.title,
    excerpt: c.content.slice(0, 200),
  }));

  const result: ResearchChatResponse = {
    answer,
    sources,
    uncertainty:
      multiPaper && chunks.length < paperIds.length
        ? "Some selected papers had no indexed content."
        : chunks.length < 2 && multiPaper
          ? "Limited context across papers."
          : null,
    disclaimer: RESEARCH_SUMMARY_DISCLAIMER,
  };

  await turboSetAsync(ck, result, TTL.chat);
  return result;
}

export async function indexPaperChunks(paperId: string, fullText: string): Promise<void> {
  const { chunkText } = await import("@/lib/services/pdf");
  const chunks = chunkText(fullText);

  await db.delete(paperChunks).where(eq(paperChunks.paperId, paperId));

  const BATCH = 3;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (content, j) => {
        const chunkIndex = i + j;
        const embedding = await embedText(content, { inputType: "passage" });
        await db.insert(paperChunks).values({
          paperId,
          chunkIndex,
          content,
          embeddingVector: serializeEmbedding(embedding),
        });
      }),
    );
  }

  if (chunks.length > 0) {
    const docEmbedding = await embedText(chunks[0], { inputType: "passage" });
    await db
      .update(papers)
      .set({
        embeddingVector: serializeEmbedding(docEmbedding),
      })
      .where(eq(papers.id, paperId));
  }
}
