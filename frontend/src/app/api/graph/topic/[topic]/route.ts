import { NextRequest, NextResponse } from "next/server";

import { buildTopicGraph } from "@/lib/services/graph";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ topic: string }> },
) {
  const { topic } = await params;
  const decoded = decodeURIComponent(topic);

  try {
    const graph = await buildTopicGraph(decoded);
    return NextResponse.json(graph);
  } catch (error) {
    console.error("Graph error:", error);
    return NextResponse.json({ error: "Graph build failed" }, { status: 500 });
  }
}
