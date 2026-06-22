"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, type MouseEvent } from "react";

import type { GraphEdge, GraphNode } from "@/types/paper";

const nodeColors: Record<string, string> = {
  paper: "#f7f4ed",
  topic: "#dceee9",
  author: "#f3e8da",
  treatment: "#e8f0ef",
};

const nodeBorders: Record<string, string> = {
  paper: "#cfc7b8",
  topic: "#0a5c52",
  author: "#9a4e1c",
  treatment: "#5e5a52",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toFlowNodes(
  nodes: GraphNode[],
  layout?: Record<string, { x: number; y: number }>,
): Node[] {
  return nodes.map((n, i) => {
    const position = layout?.[n.id] ?? {
      x: (i % 4) * 220,
      y: Math.floor(i / 4) * 120,
    };

    return {
      id: n.id,
      data: { label: n.label, nodeType: n.type },
      position,
      style: {
        background: nodeColors[n.type] ?? "#f7f4ed",
        border: `1px solid ${nodeBorders[n.type] ?? "#cfc7b8"}`,
        borderRadius: 2,
        fontSize: 11,
        fontFamily: "var(--font-dm-sans), sans-serif",
        color: "#12110e",
        padding: 8,
        width: n.type === "topic" ? 160 : 190,
        cursor: n.type === "paper" ? "pointer" : "default",
      },
    };
  });
}

function toFlowEdges(edges: GraphEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.type,
    style: { stroke: e.type === "contradicts" ? "#9a4e1c" : "#0a5c52" },
    labelStyle: { fontSize: 10, fill: "#5e5a52", fontFamily: "var(--font-jetbrains), monospace" },
  }));
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout?: Record<string, { x: number; y: number }>;
  mini?: boolean;
  className?: string;
}

export function GraphCanvas({ nodes, edges, layout, mini, className }: GraphCanvasProps) {
  const router = useRouter();
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(toFlowNodes(nodes, layout));
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(toFlowEdges(edges));

  useEffect(() => {
    setFlowNodes(toFlowNodes(nodes, layout));
    setFlowEdges(toFlowEdges(edges));
  }, [nodes, edges, layout, setFlowNodes, setFlowEdges]);

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      if (UUID_RE.test(node.id)) {
        router.push(`/paper/${node.id}`);
      }
    },
    [router],
  );

  const sizeClass = className ?? (mini ? "h-48 w-full" : "h-full w-full min-h-[400px]");

  return (
    <div className={sizeClass}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        {!mini && (
          <>
            <Background gap={20} size={1} color="#cfc7b8" />
            <Controls showInteractive={false} className="!rounded-sm !border-rule !shadow-none" />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) =>
                nodeColors[(n.data as { nodeType?: string })?.nodeType ?? "paper"] ?? "#dceee9"
              }
              maskColor="rgba(242, 237, 227, 0.75)"
            />
          </>
        )}
      </ReactFlow>
    </div>
  );
}
