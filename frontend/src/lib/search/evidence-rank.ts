/**
 * RER — Research Evidence Rank
 * ----------------------------
 * A deterministic, sub-millisecond ranking of biomedical papers by the things
 * that actually matter when weighing research, modelled on the evidence-based
 * medicine hierarchy (GRADE / Oxford CEBM Levels of Evidence).
 *
 * Every signal is extracted from the title, abstract and PubMed metadata alone
 * — no LLM, no embeddings, no extra network — so it runs on every result the
 * instant a search returns. The same score then drives three things:
 *
 *   1. the order papers are presented in (strongest evidence first),
 *   2. the headline evidence number + design tag shown on each card,
 *   3. the overview verdict, computed as an RER-weighted vote of effect
 *      directions (a meta-analysis outweighs a pile of case reports).
 *
 * Composite weights (sum = 1.0):
 *   design 0.34 · sample 0.16 · relevance 0.16 · recency 0.12 · rigor 0.14 · venue 0.08
 */

import { decodeHtmlEntities } from "@/lib/analysis-utils";
import type { PaperSummary } from "@/types/paper";

export const POSITIVE_EFFECT =
  /\b(effective|efficacy|benefit(?:ial)?|improv(?:e|ed|ement)|reduc(?:e|ed|tion)\s+(?:risk|mortality|symptoms)|protect(?:ive)?|prevent(?:ed|ion)?|associated with lower|significant(?:ly)?\s+(?:improv|reduc|better)|superior|recommended|safe and effective)\b/i;
export const NEGATIVE_EFFECT =
  /\b(ineffective|no\s+(?:significant\s+)?(?:effect|benefit|difference|association)|not\s+(?:effective|significant|associated)|fail(?:ed|s|ure)?|harm(?:ful)?|adverse|increased risk|worse(?:ned)?|no improvement|did not (?:improve|reduce)|contraindicated)\b/i;

const CURRENT_YEAR = new Date().getFullYear();

interface DesignTier {
  label: string;
  weight: number;
}

/** Ordered strongest → weakest; first match wins, so specific terms beat generic "review". */
const DESIGN_RULES: { pattern: RegExp; tier: DesignTier }[] = [
  { pattern: /\bnetwork meta-?analy/i, tier: { label: "Network meta-analysis", weight: 1.0 } },
  { pattern: /\bmeta-?analy|systematic review|cochrane\b/i, tier: { label: "Meta-analysis", weight: 0.98 } },
  { pattern: /\b(double-?blind|placebo-?controlled|randomi[sz]ed controlled trial|randomi[sz]ed.{0,24}trial|\brct\b|randomly (?:assigned|allocated))\b/i, tier: { label: "Randomized trial", weight: 0.86 } },
  { pattern: /\b(clinical trial|phase\s+(?:i{1,3}|1|2|3|iv|4)\b|interventional study)\b/i, tier: { label: "Clinical trial", weight: 0.72 } },
  { pattern: /\b(prospective cohort|cohort study|longitudinal study|prospective study|follow-?up study|registry study)\b/i, tier: { label: "Cohort", weight: 0.6 } },
  { pattern: /\bcase[-\s]?control\b/i, tier: { label: "Case-control", weight: 0.5 } },
  { pattern: /\b(cross-?sectional|observational study|population-based|survey of)\b/i, tier: { label: "Observational", weight: 0.4 } },
  { pattern: /\b(scoping review|narrative review|literature review|\breview\b)\b/i, tier: { label: "Review", weight: 0.36 } },
  { pattern: /\b(case report|case series)\b/i, tier: { label: "Case report", weight: 0.22 } },
  { pattern: /\b(in[-\s]?vitro|animal model|murine|\bmice\b|\brats?\b|preclinical|cell line|in silico)\b/i, tier: { label: "Preclinical", weight: 0.15 } },
];
const DEFAULT_TIER: DesignTier = { label: "Study", weight: 0.42 };

const HIGH_IMPACT =
  /lancet|new england journal|\bnejm\b|\bjama\b|^bmj\b|british medical journal|nature\b|\bscience\b|cochrane|circulation|\bcell\b|plos medicine|annals of internal medicine|bmj\b/i;

const QUERY_STOP = new Set([
  "the", "and", "for", "are", "was", "with", "that", "this", "from", "have",
  "does", "did", "can", "could", "should", "would", "will", "how", "why",
  "what", "which", "who", "when", "where", "is", "of", "in", "on", "to", "a",
  "an", "do", "be", "it", "or", "as", "at", "by", "vs", "versus", "help",
  "helps", "good", "bad", "safe", "effect", "effects", "benefit", "benefits",
]);

function clean(text: string): string {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function detectDesign(text: string): DesignTier {
  for (const rule of DESIGN_RULES) {
    if (rule.pattern.test(text)) return rule.tier;
  }
  return DEFAULT_TIER;
}

/** Largest plausible participant count mentioned in the abstract. */
function extractSampleSize(text: string): number | null {
  let best: number | null = null;
  const patterns = [
    /\bn\s*=\s*([\d,]{1,9})/gi,
    /\b([\d,]{2,9})\s+(?:patients|participants|subjects|individuals|adults|children|women|men|cases|people|respondents)\b/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const value = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0 && value < 100_000_000) {
        if (best === null || value > best) best = value;
      }
    }
  }
  return best;
}

function sampleScore(n: number | null): number {
  if (!n || n <= 0) return 0.25; // unknown → slightly below "small"
  return Math.min(1, Math.log10(n) / 4.3); // 100→0.46, 1k→0.70, 20k→1.0
}

function recencyScore(year: number | null): number {
  if (!year) return 0.5;
  const age = Math.max(0, CURRENT_YEAR - year);
  return Math.max(0.3, Math.min(1, 1 - age * 0.045));
}

function rigorScore(text: string): number {
  let s = 0.5;
  const add = (re: RegExp, d: number) => {
    if (re.test(text)) s += d;
  };
  add(/\bdouble-?blind/i, 0.12);
  add(/\bplacebo-?controlled/i, 0.1);
  add(/\bmulticent(?:er|re)/i, 0.08);
  add(/\b(pre-?registered|prospectively registered|registered trial)/i, 0.08);
  add(/\bintention-to-treat/i, 0.06);
  add(/\bprospective/i, 0.05);
  add(/\b(pilot|preliminary|exploratory)\b/i, -0.12);
  add(/\bretrospective/i, -0.1);
  add(/\b(small sample|underpowered|limited sample)\b/i, -0.12);
  add(/\b(case report|case series)\b/i, -0.15);
  add(/\b(uncontrolled|no control group|without a control)\b/i, -0.1);
  add(/\b(conflict of interest|industry[-\s]funded|funded by .{0,30}(inc|pharma|ltd))\b/i, -0.1);
  return Math.max(0, Math.min(1, s));
}

function venueScore(journal: string | null): number {
  if (!journal) return 0.4;
  return HIGH_IMPACT.test(journal) ? 1 : 0.6;
}

function effectDirection(text: string): -1 | 0 | 1 {
  const pos = POSITIVE_EFFECT.test(text);
  const neg = NEGATIVE_EFFECT.test(text);
  if (pos && !neg) return 1;
  if (neg && !pos) return -1;
  return 0;
}

export interface RankedPaper {
  paper: PaperSummary;
  rer: number; // 0..100
  designLabel: string;
  designWeight: number;
  sampleSize: number | null;
  year: number | null;
  direction: -1 | 0 | 1;
  reason: string;
}

export interface RankedVerdict {
  verdict: "supports" | "mixed" | "contradictory" | "insufficient";
  confidence: "high" | "moderate" | "low";
  positiveMass: number;
  negativeMass: number;
}

/** Rank a result set by Research Evidence Rank, strongest first. */
export function rankPapers(query: string, papers: PaperSummary[]): RankedPaper[] {
  const n = papers.length;
  if (n === 0) return [];

  const queryTerms = [...new Set(tokenize(query).filter((w) => !QUERY_STOP.has(w)))];

  // Pre-compute corpus stats for a BM25-lite relevance term.
  const docs = papers.map((p) => {
    const title = clean(p.title ?? "");
    const body = `${title} ${clean(p.abstract ?? "")}`;
    return { tokens: tokenize(body), titleTokens: new Set(tokenize(title)) };
  });
  const avgdl = docs.reduce((sum, d) => sum + d.tokens.length, 0) / n || 1;
  const df = new Map<string, number>();
  for (const term of queryTerms) {
    df.set(term, docs.filter((d) => d.tokens.includes(term)).length);
  }
  const K1 = 1.4;
  const B = 0.6;

  const rawRelevance = docs.map((doc) => {
    if (queryTerms.length === 0) return 0;
    const dl = doc.tokens.length || 1;
    let score = 0;
    for (const term of queryTerms) {
      const dft = df.get(term) ?? 0;
      if (dft === 0) continue;
      const idf = Math.log(1 + (n - dft + 0.5) / (dft + 0.5));
      let tf = doc.tokens.reduce((c, t) => (t === term ? c + 1 : c), 0);
      if (doc.titleTokens.has(term)) tf += 2; // title hits matter more
      if (tf === 0) continue;
      score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * dl) / avgdl)));
    }
    return score;
  });
  const maxRel = Math.max(...rawRelevance, 0);

  const ranked = papers.map((paper, i): RankedPaper => {
    const text = `${clean(paper.title ?? "")} ${clean(paper.abstract ?? "")}`;
    const design = detectDesign(text);
    const sampleSize = extractSampleSize(text);
    const year = paper.publicationDate ? Number(paper.publicationDate.slice(0, 4)) : null;
    const relevance = maxRel > 0 ? rawRelevance[i] / maxRel : 0;

    const composite =
      0.34 * design.weight +
      0.16 * sampleScore(sampleSize) +
      0.16 * relevance +
      0.12 * recencyScore(year) +
      0.14 * rigorScore(text) +
      0.08 * venueScore(paper.journal);

    const reasonParts = [design.label];
    if (sampleSize) reasonParts.push(`n≈${sampleSize.toLocaleString("en-US")}`);
    if (year) reasonParts.push(String(year));

    return {
      paper,
      rer: Math.round(Math.max(0, Math.min(1, composite)) * 100),
      designLabel: design.label,
      designWeight: design.weight,
      sampleSize,
      year,
      direction: effectDirection(text),
      reason: reasonParts.join(", "),
    };
  });

  ranked.sort((a, b) => {
    if (b.rer !== a.rer) return b.rer - a.rer;
    if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
    return (b.sampleSize ?? 0) - (a.sampleSize ?? 0);
  });

  return ranked;
}

/**
 * Verdict as an evidence-weighted vote: each paper's effect direction is
 * weighted by its RER and amplified by its design tier, so stronger designs
 * move the needle more than weak ones.
 */
export function verdictFromRanked(ranked: RankedPaper[]): RankedVerdict {
  const count = ranked.length;
  if (count === 0) {
    return { verdict: "insufficient", confidence: "low", positiveMass: 0, negativeMass: 0 };
  }

  let positiveMass = 0;
  let negativeMass = 0;
  for (const r of ranked) {
    const weight = (r.rer / 100) * (0.5 + r.designWeight);
    if (r.direction > 0) positiveMass += weight;
    else if (r.direction < 0) negativeMass += weight;
  }

  const total = positiveMass + negativeMass;
  if (count === 1 || total < 0.05) {
    return { verdict: "insufficient", confidence: "low", positiveMass, negativeMass };
  }

  const share = positiveMass / total;
  let verdict: RankedVerdict["verdict"];
  if (negativeMass === 0 && positiveMass > 0) verdict = "supports";
  else if (positiveMass === 0 && negativeMass > 0) verdict = "contradictory";
  else if (share >= 0.66) verdict = "supports";
  else if (share <= 0.34) verdict = "contradictory";
  else verdict = "mixed";

  const margin = Math.abs(share - 0.5) * 2; // 0..1
  const topTier = ranked[0]?.designWeight ?? 0;
  const strongCount = ranked.filter((r) => r.designWeight >= 0.86).length;
  let confidence: RankedVerdict["confidence"] = "low";
  if (topTier >= 0.86 && (margin >= 0.5 || strongCount >= 2)) confidence = "high";
  else if (topTier >= 0.6 || margin >= 0.4) confidence = "moderate";

  return { verdict, confidence, positiveMass, negativeMass };
}
