import { eq } from "drizzle-orm";

import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { researchGraphs } from "@/lib/db/schema";
import { expandSearchQuery } from "@/lib/search/query-helper";
import { upsertPubMedPapers } from "@/lib/services/paper-sync";
import { searchPubMed } from "@/lib/services/pubmed";
import type { GraphEdge, GraphNode, GraphResponse } from "@/types/paper";

function radialPosition(index: number, total: number, radiusX: number, radiusY: number) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  return {
    x: 320 + Math.cos(angle) * radiusX,
    y: 280 + Math.sin(angle) * radiusY,
  };
}

export async function buildTopicGraph(topic: string): Promise<GraphResponse> {
  const { searchQuery } = expandSearchQuery(topic);
  const pubmedResults = await searchPubMed(searchQuery, 12, {});
  const synced = await upsertPubMedPapers(pubmedResults);

  const topicPapers = synced.slice(0, 10);
  const nodes: GraphNode[] = [{ id: "topic-root", label: topic, type: "topic" }];
  const edges: GraphEdge[] = [];
  const flowPositions = new Map<string, { x: number; y: number }>();

  flowPositions.set("topic-root", { x: 320, y: 280 });

  for (let i = 0; i < topicPapers.length; i++) {
    const paper = topicPapers[i];
    nodes.push({
      id: paper.id,
      label: paper.title.length > 55 ? `${paper.title.slice(0, 52)}…` : paper.title,
      type: "paper",
    });
    flowPositions.set(paper.id, radialPosition(i, topicPapers.length, 260, 200));

    edges.push({
      id: `edge-topic-${paper.id}`,
      source: "topic-root",
      target: paper.id,
      type: "references",
    });

    if (paper.authors?.[0]) {
      const authorId = `author-${paper.authors[0].replace(/\s/g, "-").slice(0, 40)}`;
      if (!nodes.find((n) => n.id === authorId)) {
        nodes.push({
          id: authorId,
          label: paper.authors[0],
          type: "author",
        });
        flowPositions.set(authorId, radialPosition(i + 0.5, topicPapers.length, 380, 280));
      }
      edges.push({
        id: `edge-author-${paper.id}`,
        source: authorId,
        target: paper.id,
        type: "references",
      });
    }
  }

  const paperIds = new Set(topicPapers.map((p) => p.id));
  const graphEdges = await db.select().from(researchGraphs).limit(40);
  for (const ge of graphEdges) {
    if (paperIds.has(ge.sourcePaper) && paperIds.has(ge.targetPaper)) {
      edges.push({
        id: `edge-${ge.id}`,
        source: ge.sourcePaper,
        target: ge.targetPaper,
        type: ge.relationshipType.toLowerCase(),
      });
    }
  }

  return {
    topic,
    nodes,
    edges,
    layout: Object.fromEntries(flowPositions),
  };
}

export async function seedGraphFromPapers(
  sourceId: string,
  targetId: string,
  relationship: "SUPPORTS" | "CONTRADICTS" | "EXTENDS" | "REFERENCES",
): Promise<void> {
  await db.insert(researchGraphs).values({
    sourcePaper: sourceId,
    targetPaper: targetId,
    relationshipType: relationship,
  });
}
