import { POPULAR_TOPICS, type PopularTopic } from "@/lib/content/public-topics";

/** Plain speech → medical / PubMed terms */
const PHRASE_MAP: [RegExp | string, string][] = [
  ["heart attack", "myocardial infarction"],
  ["heart disease", "cardiovascular disease"],
  ["high blood pressure", "hypertension"],
  ["low blood pressure", "hypotension"],
  ["sugar diabetes", "diabetes mellitus"],
  ["type 2 diabetes", "diabetes mellitus type 2"],
  ["belly fat", "abdominal obesity"],
  ["stomach flu", "gastroenteritis"],
  ["flu shot", "influenza vaccine"],
  ["covid vaccine", "COVID-19 vaccine"],
  ["long covid", "post-acute COVID-19 syndrome"],
  ["ozempic", "semaglutide obesity"],
  ["wegovy", "semaglutide weight loss"],
  ["mounjaro", "tirzepatide obesity"],
  ["adhd", "attention deficit hyperactivity disorder"],
  ["autism", "autism spectrum disorder"],
  ["ear infection", "otitis media"],
  ["sore throat", "pharyngitis"],
  ["runny nose", "rhinitis"],
  ["hay fever", "allergic rhinitis"],
  ["panic attack", "panic disorder"],
  ["burnout", "occupational stress exhaustion"],
  ["gut health", "gastrointestinal microbiome"],
  ["probiotics", "probiotics gastrointestinal"],
  ["melatonin", "melatonin sleep"],
  ["birth control", "contraception"],
  ["menopause", "menopause symptoms treatment"],
  ["pregnancy", "pregnancy health"],
  ["breast cancer", "breast neoplasms"],
  ["lung cancer", "lung neoplasms"],
  ["skin cancer", "skin neoplasms melanoma"],
  ["wrinkles", "skin aging"],
  ["hair loss", "alopecia"],
  ["acne", "acne vulgaris treatment"],
  ["eczema", "dermatitis atopic"],
  ["asthma", "asthma treatment"],
  ["allergies", "hypersensitivity"],
  ["ibuprofen", "ibuprofen safety"],
  ["tylenol", "acetaminophen safety"],
  ["antibiotics", "anti-bacterial agents"],
  ["strep throat", "streptococcal pharyngitis"],
  ["uti", "urinary tract infection"],
  ["kidney stones", "urolithiasis"],
  ["gout", "gout treatment"],
  ["arthritis", "osteoarthritis rheumatoid"],
  ["osteoporosis", "bone density osteoporosis"],
  ["cholesterol", "hyperlipidemia cholesterol"],
  ["statins", "hydroxymethylglutaryl-CoA reductase inhibitors"],
  ["smoking", "tobacco smoking cessation"],
  ["vaping", "electronic nicotine delivery systems"],
  ["marijuana", "cannabis medical"],
  ["cbd", "cannabidiol"],
  ["compulsive attachment", "insecure attachment attachment style psychotherapy"],
  ["attachment issues", "insecure attachment attachment style psychotherapy"],
  ["attachment problems", "insecure attachment attachment style psychotherapy"],
  ["insecure attachment", "insecure attachment style adult attachment psychotherapy"],
  ["attachment style", "attachment style adult attachment interpersonal relations"],
  ["relationship anxiety", "attachment anxiety interpersonal relationships psychotherapy"],
  ["breakup", "romantic breakup psychological adjustment"],
  ["loneliness", "loneliness mental health social isolation"],
  ["self esteem", "self-esteem mental health"],
  ["trauma", "psychological trauma mental health treatment"],
  ["ptsd", "post-traumatic stress disorder treatment"],
  ["grief", "bereavement grief counseling"],
  ["masturbating", "masturbation"],
  ["masturbate", "masturbation"],
  ["every day", "daily"],
  ["everyday", "daily"],
];

/** Everyday questions → PubMed queries with field tags (when phrase map did not apply). */
const INTENT_REWRITES: { test: RegExp; query: string; label?: string }[] = [
  {
    test: /\b(compulsive\s+attachment|attachment\s+disorder|(cure|treat|treats|treating|fix|fixing|heal|healing|overcome|overcoming)\b.*\battachment\b|attachment\s+(issues?|problems?|styles?|disorder|therapy|insecurity)|insecure\s+attachment|attachment\s+(avoidant|anxious)|overcome\s+attachment|attachment\s+(in\s+)?relationships?)\b/i,
    query:
      '(attachment style[Title/Abstract] OR insecure attachment[Title/Abstract] OR "object attachment"[MeSH Terms]) AND humans[MeSH Terms] NOT (solder[Title/Abstract] OR implant[Title/Abstract] OR nanoparticle[Title/Abstract] OR polymer[Title/Abstract])',
    label: "psychology attachment research",
  },
  {
    test: /\b(overcome|deal with|cope with|fix|heal from)\b.*\b(breakup|heartbreak|rejection)\b/i,
    query: "romantic breakup psychological adjustment coping therapy",
  },
  {
    test: /\b(trust issues|commitment issues|fear of intimacy)\b/i,
    query: "attachment style intimacy interpersonal relationships psychotherapy",
  },
  {
    test: /\bmasturbat/i,
    query:
      "(masturbation[Title/Abstract] OR masturbation[MeSH Terms]) AND (frequency OR daily OR health)",
    label: "masturbation frequency and health",
  },
];

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "can", "could", "should", "would", "will", "shall",
  "may", "might", "must", "have", "has", "had", "having",
  "what", "which", "who", "whom", "whose", "where", "when", "why", "how",
  "i", "me", "my", "you", "your", "we", "our", "they", "their", "it", "its",
  "for", "of", "in", "on", "at", "to", "from", "with", "about", "into", "through",
  "and", "or", "but", "if", "then", "so", "than", "too", "very", "just",
  "really", "actually", "even", "also", "still", "already", "any", "some",
  "much", "many", "more", "most", "other", "such", "only", "own", "same",
  "help", "helps", "helping", "helped", "work", "works", "working", "worked",
  "good", "bad", "better", "worse", "best", "worst", "worth", "safe", "unsafe",
  "people", "person", "thing", "things", "something", "anything",
  "get", "gets", "getting", "got", "make", "makes", "making", "made",
  "know", "think", "tell", "say", "said", "look", "find", "use", "using",
  "long", "short", "new", "old", "normal",
]);

function normalize(text: string | null | undefined): string {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[?!.,;:'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasMatches(input: string, alias: string): boolean {
  const n = normalize(input);
  const a = normalize(alias);
  if (!n || !a) return false;
  if (n === a) return true;
  if (n.includes(a)) return true;
  const inputWords = n.split(" ").filter((w) => w.length > 2);
  if (inputWords.length >= 2 && a.includes(n)) return true;
  return false;
}

function findTopicMatch(input: string): PopularTopic | undefined {
  const n = normalize(input);
  if (!n) return undefined;

  for (const topic of POPULAR_TOPICS) {
    if (normalize(topic.label) === n || normalize(topic.query) === n) return topic;
    if (topic.aliases?.some((a) => aliasMatches(input, a))) {
      return topic;
    }
    const labelWords = normalize(topic.label).split(" ").filter((w) => w.length > 3);
    const inputWords = n.split(" ").filter((w) => w.length > 3);
    const overlap = labelWords.filter((w) => inputWords.includes(w)).length;
    if (inputWords.length >= 2 && overlap >= 2) return topic;
  }
  return undefined;
}

function phrasePattern(from: string): RegExp {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (from.length <= 4) {
    return new RegExp(`\\b${escaped}\\b`, "gi");
  }
  return new RegExp(escaped, "gi");
}

function applyPhraseMap(text: string): string {
  let result = text;
  for (const [from, to] of PHRASE_MAP) {
    const pattern = typeof from === "string" ? phrasePattern(from) : from;
    result = result.replace(pattern, to);
  }
  return result;
}

function fixTypos(text: string): string {
  return text.replace(/attachement/gi, "attachment");
}

function stripQuestionFraming(text: string): string {
  return text
    .replace(/^(cure|cures|curing|treat|treats|treating|fix|fixing|heal|healing|overcome|overcoming)\s+(for\s+)?/i, "")
    .replace(/\bbad\s+for\s+(you|me)\b/gi, "adverse health effects")
    .replace(/\bgood\s+for\s+(you|me)\b/gi, "health benefits")
    .replace(/^how\s+to\s+/i, "")
    .replace(/^how\s+(can|do|does)\s+(i|you|we)\s+/i, "")
    .replace(/^(does|do|is|are|was|were|can|could|should|would|will|shall|may|might|must)\s+/i, "")
    .replace(/^(what|which|who|how|why|when|where)\s+(is|are|does|do|can|should|helps?|causes?|about)\s+/i, "")
    .replace(/\b(help|helps|help with|worth it|actually|really|overcome|overcoming)\b/gi, " ")
    .replace(/\?+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeSearchQuery(text: string): string {
  const words = text
    .split(" ")
    .filter((w): w is string => typeof w === "string" && w.length > 0);
  if (words.length === 0) return "";
  const first = words[0]?.toLowerCase();
  if (words.length === 1 && first && STOP_WORDS.has(first)) return "";

  let start = 0;
  let end = words.length;
  while (start < end) {
    const word = words[start]?.toLowerCase();
    if (!word || !STOP_WORDS.has(word)) break;
    start++;
  }
  while (end > start) {
    const word = words[end - 1]?.toLowerCase();
    if (!word || !STOP_WORDS.has(word)) break;
    end--;
  }
  return words.slice(start, end).join(" ");
}

function meaningfulTokenCount(text: string): number {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w)).length;
}

function findIntentRewrite(input: string): { query: string; label?: string } | undefined {
  const n = normalize(input);
  for (const rule of INTENT_REWRITES) {
    if (rule.test.test(n)) {
      return { query: rule.query, label: rule.label };
    }
  }
  return undefined;
}

function extractKeywords(text: string): string {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 8)
    .join(" ");
}

export interface ExpandedQuery {
  originalQuery: string;
  searchQuery: string;
  /** Shown to users when we changed their words */
  translatedFrom?: string;
  /** Short hint about how the query was interpreted */
  searchHint?: string;
  matchedTopic?: PopularTopic;
}

/** Turn everyday language into something PubMed can find. */
export function expandSearchQuery(raw: string | null | undefined): ExpandedQuery {
  const originalQuery = String(raw ?? "").trim();
  if (!originalQuery) {
    return { originalQuery: "", searchQuery: "" };
  }

  try {
    const correctedQuery = fixTypos(originalQuery);

    const matchedTopic = findTopicMatch(correctedQuery);
    if (matchedTopic) {
      return {
        originalQuery,
        searchQuery: matchedTopic.query,
        translatedFrom: originalQuery,
        matchedTopic,
      };
    }

    const intent = findIntentRewrite(correctedQuery);
    if (intent) {
      return {
        originalQuery,
        searchQuery: intent.query,
        translatedFrom: originalQuery,
        searchHint: intent.label,
      };
    }

    let working = normalize(correctedQuery);
    const afterPhrase = applyPhraseMap(working);
    if (afterPhrase !== working) {
      working = sanitizeSearchQuery(stripQuestionFraming(afterPhrase));
      return {
        originalQuery,
        searchQuery: working || afterPhrase,
        translatedFrom: originalQuery,
        searchHint: "mapped to research terms",
      };
    }

    working = sanitizeSearchQuery(stripQuestionFraming(working));

    let searchQuery = working.split(" ").filter(Boolean).join(" ");
    if (meaningfulTokenCount(searchQuery) < 2) {
      searchQuery = extractKeywords(correctedQuery);
    }
    if (!searchQuery) {
      searchQuery = originalQuery;
    }

    const changed = normalize(searchQuery) !== normalize(originalQuery);

    return {
      originalQuery,
      searchQuery,
      translatedFrom: changed ? originalQuery : undefined,
    };
  } catch {
    return { originalQuery, searchQuery: originalQuery };
  }
}

export function getSearchSuggestions(input: string | null | undefined, limit = 8): PopularTopic[] {
  try {
    const n = normalize(input);
    if (!n) return POPULAR_TOPICS.slice(0, limit);

    const scored = POPULAR_TOPICS.map((topic) => {
      let score = 0;
      const label = normalize(topic.label);
      const query = normalize(topic.query);
      if (label.startsWith(n) || label.includes(n)) score += 10;
      if (query.includes(n)) score += 6;
      for (const word of n.split(" ")) {
        if (word.length < 3) continue;
        if (label.includes(word)) score += 3;
        if (query.includes(word)) score += 2;
        if (topic.aliases?.some((a) => normalize(a).includes(word))) score += 4;
      }
      return { topic, score };
    })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ topic }) => topic);
  } catch {
    return POPULAR_TOPICS.slice(0, limit);
  }
}
