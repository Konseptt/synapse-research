/** Human-facing copy for Synapse's custom Research Evidence Rank (RER). */
export const RER_NAME = "Research Evidence Rank";
export const RER_SHORT = "RER";

export const RER_TAGLINE =
  "Synapse ranks every study with our custom Research Evidence Rank (RER), a 0–100 score from study design, sample size, how well it matches your question, recency, rigor, and journal quality. No black box: instant, deterministic, built for evidence-based medicine.";

export const RER_SCORE_TOOLTIP = (score: number) =>
  `${RER_SHORT} score: ${Math.round(score)} of 100. Our custom algorithm weighs study design, sample size, relevance to your question, recency, rigor, and journal tier. Higher usually means stronger evidence.`;

export const RER_COMPACT_TOOLTIP = (score: number) =>
  `${RER_SHORT}: ${Math.round(score)}/100. Custom evidence rank (design, sample, relevance, recency).`;
