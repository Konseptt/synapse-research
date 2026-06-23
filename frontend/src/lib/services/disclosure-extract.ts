/** Pull funding / COI lines from abstract or full-text when the LLM returns null. */

const COI_SECTION =
  /(?:conflicts?\s+of\s+interest|competing\s+interests?|competing\s+financial\s+interests?|declaration\s+of\s+interests?|financial\s+disclosure|disclosure\s+statement)[:\s-]+([^\n]+)/i;

const COI_DECLARE =
  /(?:the\s+)?authors?\s+(?:have\s+)?(?:declare|report|disclose)(?:s|d)?\s+(?:no\s+)?(?:conflicts?|competing\s+interests?|financial\s+interests?)[^.]*\.?/i;

const FUNDING_SECTION =
  /(?:funding|financial\s+support|grant\s+support|source\s+of\s+funding|role\s+of\s+(?:the\s+)?funder)[:\s-]+([^\n]+)/i;

const FUNDING_SUPPORTED =
  /(?:this\s+(?:work|study|research)\s+)?(?:was\s+)?(?:supported|funded)\s+by\s+([^.]+\.?)/i;

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = (match[1] ?? match[0]).trim();
    if (value.length > 3) return value.replace(/\s+/g, " ");
  }
  return null;
}

export function extractConflictOfInterest(text: string | null | undefined): string | null {
  const normalized = String(text ?? "").trim();
  if (!normalized) return null;
  return firstMatch(normalized, [COI_SECTION, COI_DECLARE]);
}

export function extractFunding(text: string | null | undefined): string | null {
  const normalized = String(text ?? "").trim();
  if (!normalized) return null;
  return firstMatch(normalized, [FUNDING_SECTION, FUNDING_SUPPORTED]);
}

/** Prefer stored analysis; fall back to regex on abstract/full text. */
export function resolveDisclosure(
  stored: string | null | undefined,
  paperText: string | null | undefined,
  kind: "funding" | "coi",
): string | null {
  if (stored?.trim()) return stored.trim();
  return kind === "funding"
    ? extractFunding(paperText)
    : extractConflictOfInterest(paperText);
}
