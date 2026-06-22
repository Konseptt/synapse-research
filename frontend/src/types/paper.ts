export type RelationshipType = "SUPPORTS" | "CONTRADICTS" | "EXTENDS" | "REFERENCES";

export interface PaperSummary {
  id: string;
  title: string;
  abstract: string | null;
  doi: string | null;
  pubmedId: string | null;
  publicationDate: string | null;
  journal: string | null;
  authors: string[] | null;
  evidenceScore: number | null;
  source: string;
}

export interface PaperAnalysis {
  researchQuestion: string | null;
  methodology: string | null;
  sampleSize: string | null;
  population: string | null;
  results: string | null;
  limitations: string | null;
  confidenceScore: number | null;
  findings: string[] | null;
  plainSummary: string | null;
  conflictOfInterest: string | null;
  funding: string | null;
  status: string;
}

export interface PaperDetail extends PaperSummary {
  fullText: string | null;
  analysis: PaperAnalysis | null;
  createdAt: string | null;
}

export interface EvidenceScore {
  score: number;
  studyTypeScore: number;
  sampleSizeScore: number;
  recencyScore: number;
  biasScore: number;
  reasoning: string | null;
}

export interface SearchFilters {
  yearFrom?: number;
  yearTo?: number;
  studyType?: string;
  journal?: string;
  minSampleSize?: number;
}

export interface CitationSource {
  paperId: string;
  title: string;
  excerpt: string;
}

export interface ResearchChatResponse {
  answer: string;
  sources: CitationSource[];
  uncertainty: string | null;
  disclaimer: string;
}

export interface SearchOverviewSource {
  index: number;
  paperId: string;
  title: string;
  journal: string | null;
  year: string | null;
  pubmedId: string | null;
  excerpt: string;
}

export interface SearchOverviewResponse {
  query: string;
  summary: string;
  verdict: "supports" | "mixed" | "contradictory" | "insufficient";
  verdictLabel: string;
  sources: SearchOverviewSource[];
  uncertainty: string | null;
  disclaimer: string;
  generatedBy?: "ai" | "instant" | "heuristic";
}

export interface GraphNode {
  id: string;
  label: string;
  type: "paper" | "topic" | "author" | "treatment";
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface GraphResponse {
  topic: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout?: Record<string, { x: number; y: number }>;
}

export interface ConflictPairResult {
  paperAId: string;
  paperBId: string;
  paperATitle: string;
  paperBTitle: string;
  agreement: boolean;
  reason: string;
}

export interface CompareResponse {
  papers: PaperDetail[];
}
