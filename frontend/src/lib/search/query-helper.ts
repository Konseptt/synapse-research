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
];

/** Everyday questions → PubMed queries with field tags (when phrase map did not apply). */
const INTENT_REWRITES: { test: RegExp; query: string; label?: string }[] = [
  {
    test: /\b(attachment\s+(issues?|problems?|styles?|disorder|therapy|insecurity)|insecure\s+attachment|attachment\s+(avoidant|anxious)|overcome\s+attachment|attachment\s+(in\s+)?relationships?)\b/i,
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
  "long", "short", "new", "old", "everyday", "normal",
]);

function normalize(text: string): string {
  return text
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

function applyPhraseMap(text: string): string {
  let result = text;
  for (const [from, to] of PHRASE_MAP) {
    const pattern = typeof from === "string" ? new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi") : from;
    result = result.replace(pattern, to);
  }
  return result;
}

function stripQuestionFraming(text: string): string {
  return text
    .replace(/^how\s+to\s+/i, "")
    .replace(/^how\s+(can|do|does)\s+(i|you|we)\s+/i, "")
    .replace(/^(does|do|is|are|was|were|can|could|should|would|will|shall|may|might|must)\s+/i, "")
    .replace(/^(what|which|who|how|why|when|where)\s+(is|are|does|do|can|should|helps?|causes?|about)\s+/i, "")
    .replace(/\b(help|helps|help with|good for|bad for|worth it|actually|really|overcome|overcoming)\b/gi, " ")
    .replace(/\?+$/, "")
    .replace(/\s+/g, " ")
    .trim();
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
export function expandSearchQuery(raw: string): ExpandedQuery {
  const originalQuery = raw.trim();
  if (!originalQuery) {
    return { originalQuery: "", searchQuery: "" };
  }

  const matchedTopic = findTopicMatch(originalQuery);
  if (matchedTopic) {
    return {
      originalQuery,
      searchQuery: matchedTopic.query,
      translatedFrom: originalQuery,
      matchedTopic,
    };
  }

  const intent = findIntentRewrite(originalQuery);
  if (intent) {
    return {
      originalQuery,
      searchQuery: intent.query,
      translatedFrom: originalQuery,
      searchHint: intent.label,
    };
  }

  let working = normalize(originalQuery);
  const afterPhrase = applyPhraseMap(working);
  if (afterPhrase !== working) {
    working = stripQuestionFraming(afterPhrase);
    return {
      originalQuery,
      searchQuery: working || afterPhrase,
      translatedFrom: originalQuery,
      searchHint: "mapped to research terms",
    };
  }

  working = stripQuestionFraming(working);

  let searchQuery = working.split(" ").filter(Boolean).join(" ");
  if (searchQuery.split(" ").length < 2) {
    searchQuery = extractKeywords(originalQuery);
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
}

export function getSearchSuggestions(input: string, limit = 8): PopularTopic[] {
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
}
