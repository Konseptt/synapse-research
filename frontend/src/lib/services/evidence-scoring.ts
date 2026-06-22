import type { PaperAnalysis } from "@/types/paper";

const STUDY_TYPE_WEIGHTS: Record<string, number> = {
  meta: 30,
  "systematic review": 30,
  rct: 25,
  "randomized controlled": 25,
  cohort: 15,
  "case study": 5,
  "case report": 5,
};

const SAMPLE_SIZE_THRESHOLDS = [
  { min: 1000, score: 25 },
  { min: 500, score: 20 },
  { min: 100, score: 10 },
];

export interface ScoreBreakdown {
  score: number;
  studyTypeScore: number;
  sampleSizeScore: number;
  recencyScore: number;
  biasScore: number;
  reasoning: string;
}

function parseSampleSize(sampleSize: string | null): number {
  if (!sampleSize) return 0;
  const match = sampleSize.match(/(\d[\d,]*)/);
  if (!match) return 0;
  return parseInt(match[1].replace(/,/g, ""), 10);
}

function detectStudyType(text: string): { type: string; score: number } {
  const lower = text.toLowerCase();
  for (const [key, score] of Object.entries(STUDY_TYPE_WEIGHTS)) {
    if (lower.includes(key)) return { type: key, score };
  }
  return { type: "unknown", score: 0 };
}

export function scoreEvidence(
  paper: {
    title: string;
    abstract: string | null;
    publicationDate: Date | null;
    journal: string | null;
  },
  analysis: PaperAnalysis | null,
): ScoreBreakdown {
  const combined = [
    paper.title,
    paper.abstract ?? "",
    analysis?.methodology ?? "",
    analysis?.results ?? "",
    analysis?.limitations ?? "",
  ].join(" ");

  const { type, score: studyTypeScore } = detectStudyType(combined);

  const sampleN = parseSampleSize(analysis?.sampleSize ?? null);
  let sampleSizeScore = 0;
  for (const t of SAMPLE_SIZE_THRESHOLDS) {
    if (sampleN >= t.min) {
      sampleSizeScore = t.score;
      break;
    }
  }

  let recencyScore = 0;
  if (paper.publicationDate) {
    const ageYears = (Date.now() - paper.publicationDate.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (ageYears < 5) recencyScore = 20;
  }

  let biasScore = 0;
  const lower = combined.toLowerCase();
  if (paper.journal) biasScore += 20;
  if (lower.includes("conflict of interest") || lower.includes("industry funded")) biasScore -= 15;
  if (sampleN > 0 && sampleN < 50) biasScore -= 10;
  if (lower.includes("no control") || lower.includes("missing control")) biasScore -= 10;

  const raw = studyTypeScore + sampleSizeScore + recencyScore + Math.max(biasScore, 0);
  const score = Math.min(100, Math.max(0, raw));

  const reasoning = [
    `Study type: ${type} (+${studyTypeScore})`,
    `Sample size: ${sampleN || "unknown"} (+${sampleSizeScore})`,
    `Recency (+${recencyScore})`,
    `Quality adjustments (${biasScore >= 0 ? "+" : ""}${biasScore})`,
  ].join(". ");

  return { score, studyTypeScore, sampleSizeScore, recencyScore, biasScore, reasoning };
}
