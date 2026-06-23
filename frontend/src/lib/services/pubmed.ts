import { XMLParser } from "fast-xml-parser";

import { config } from "@/lib/config";
import { xmlText } from "@/lib/services/pubmed-parse";

export interface PubMedPaper {
  pubmedId: string;
  title: string;
  abstract: string | null;
  doi: string | null;
  authors: string[];
  journal: string | null;
  publicationDate: Date | null;
}

export interface PubMedSearchOptions {
  maxResults?: number;
  yearFrom?: number;
  yearTo?: number;
  studyType?: string;
}

const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

function ncbiParams(): string {
  return `tool=${encodeURIComponent(config.ncbiTool)}&email=${encodeURIComponent(config.ncbiEmail)}`;
}

function studyTypeClause(studyType: string): string | null {
  const normalized = studyType.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("meta") || normalized.includes("systematic")) {
    return "(systematic review[pt] OR meta-analysis[pt])";
  }
  if (normalized.includes("rct") || normalized.includes("random")) {
    return "randomized controlled trial[pt]";
  }
  if (normalized.includes("clinical") || normalized.includes("trial")) {
    return "clinical trial[pt]";
  }
  if (normalized.includes("review")) {
    return "review[pt]";
  }
  return `"${studyType}"[Title/Abstract]`;
}

export function buildPubMedQuery(query: string, options?: PubMedSearchOptions): string {
  const hasFieldTags = /\[[A-Za-z /]+\]/.test(query);
  const parts = [hasFieldTags ? query : `(${query})`];

  if (options?.yearFrom) parts.push(`${options.yearFrom}:3000[dp]`);
  if (options?.yearTo) parts.push(`1800:${options.yearTo}[dp]`);
  const studyClause = options?.studyType ? studyTypeClause(options.studyType) : null;
  if (studyClause) parts.push(studyClause);

  return parts.join(" AND ");
}

async function fetchWithRetry(url: string, retries = 3, timeoutMs = 10_000): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      clearTimeout(timer);
      lastError = error instanceof Error ? error : new Error("Fetch failed");
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  throw lastError ?? new Error("Fetch failed");
}

export async function searchPubMed(
  query: string,
  maxResults = config.pubmedMaxResults,
  options?: Omit<PubMedSearchOptions, "maxResults">,
): Promise<PubMedPaper[]> {
  const term = buildPubMedQuery(query, { ...options, maxResults });
  const searchUrl = `${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmax=${maxResults}&retmode=json&${ncbiParams()}`;
  const searchRes = await fetchWithRetry(searchUrl);
  if (!searchRes.ok) throw new Error("PubMed search failed");

  const searchData = (await searchRes.json()) as {
    esearchresult?: { idlist?: string[] };
  };
  const ids = searchData.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  const fetchUrl = `${BASE}/efetch.fcgi?db=pubmed&id=${ids.join(",")}&retmode=xml&${ncbiParams()}`;
  const fetchRes = await fetchWithRetry(fetchUrl);
  if (!fetchRes.ok) throw new Error("PubMed fetch failed");

  const xml = await fetchRes.text();
  return parsePubMedXml(xml);
}

function parsePubMedDate(pd: Record<string, unknown> | undefined): Date | null {
  if (!pd?.Year) return null;

  const year = Number(pd.Year);
  if (!Number.isFinite(year)) return null;

  let month = 0;
  const rawMonth = pd.Month;
  if (typeof rawMonth === "number" || /^\d+$/.test(String(rawMonth ?? ""))) {
    month = Math.max(0, Number(rawMonth) - 1);
  } else if (typeof rawMonth === "string") {
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    month = months[rawMonth.slice(0, 3)] ?? 0;
  }

  const day = Number(pd.Day ?? 1);
  const date = new Date(year, month, Number.isFinite(day) ? day : 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAbstractSections(abstractText: unknown): {
  abstract: string | null;
  conflictOfInterest: string | null;
  funding: string | null;
} {
  if (abstractText == null) {
    return { abstract: null, conflictOfInterest: null, funding: null };
  }

  const items = Array.isArray(abstractText) ? abstractText : [abstractText];
  const blocks: string[] = [];
  let conflictOfInterest: string | null = null;
  let funding: string | null = null;

  for (const item of items) {
    if (typeof item === "object" && item !== null && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;
      const label = obj["@_Label"] ? String(obj["@_Label"]).trim() : "";
      const body = xmlText(item).trim();
      if (!body) continue;

      if (label) {
        blocks.push(`${label}: ${body}`);
        const ll = label.toLowerCase();
        if (!conflictOfInterest && /conflict|competing|disclosure|interest/.test(ll)) {
          conflictOfInterest = body;
        }
        if (!funding && /fund|grant|support|sponsor|financial/.test(ll)) {
          funding = body;
        }
      } else {
        blocks.push(body);
      }
    } else {
      const body = xmlText(item).trim();
      if (body) blocks.push(body);
    }
  }

  return { abstract: blocks.join("\n\n") || null, conflictOfInterest, funding };
}

function formatGrantList(grantList: unknown): string | null {
  if (!grantList || typeof grantList !== "object") return null;
  const grants = (grantList as Record<string, unknown>).Grant;
  const list = grants ? (Array.isArray(grants) ? grants : [grants]) : [];
  const parts = list
    .map((grant: Record<string, unknown>) => {
      const id = xmlText(grant.GrantID).trim();
      const agency = xmlText(grant.Agency).trim();
      if (id && agency) return `${agency} ${id}`;
      return id || agency;
    })
    .filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : null;
}

function parsePubMedXml(xml: string): PubMedPaper[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const data = parser.parse(xml);
  const articles = data?.PubmedArticleSet?.PubmedArticle;
  const list = Array.isArray(articles) ? articles : articles ? [articles] : [];

  return list.map((article: Record<string, unknown>) => {
    const medline = article.MedlineCitation as Record<string, unknown>;
    const articleData = medline.Article as Record<string, unknown>;
    const pubmedData = article.PubmedData as Record<string, unknown>;
    const pmid = String((medline.PMID as Record<string, unknown>)?.["#text"] ?? "");
    const title = xmlText(articleData.ArticleTitle) || "Untitled";
    const abstractObj = articleData.Abstract as Record<string, unknown> | undefined;
    const parsedAbstract = parseAbstractSections(abstractObj?.AbstractText);
    const coiStatement = xmlText(articleData.CoiStatement).trim() || null;
    const grantSummary = formatGrantList(articleData.GrantList);

    const extraSections: string[] = [];
    if (coiStatement && !parsedAbstract.conflictOfInterest) {
      extraSections.push(`CONFLICT OF INTEREST: ${coiStatement}`);
    }
    if (grantSummary && !parsedAbstract.funding) {
      extraSections.push(`FUNDING: ${grantSummary}`);
    }

    const abstract =
      [parsedAbstract.abstract, ...extraSections].filter(Boolean).join("\n\n") || null;

    const authorList = (articleData.AuthorList as Record<string, unknown>)?.Author;
    const authors = authorList
      ? (Array.isArray(authorList) ? authorList : [authorList]).map((a: Record<string, unknown>) => {
          const last = String(a.LastName ?? "");
          const fore = String(a.ForeName ?? "");
          return `${last}${fore ? ` ${fore}` : ""}`.trim();
        })
      : [];

    const journal = String(
      ((articleData.Journal as Record<string, unknown>)?.Title as string) ?? "",
    ) || null;

    const pubDate = (articleData.Journal as Record<string, unknown>)?.JournalIssue as Record<
      string,
      unknown
    >;
    const pd = pubDate?.PubDate as Record<string, unknown> | undefined;
    const publicationDate = parsePubMedDate(pd);

    const articleIds = (pubmedData?.ArticleIdList as Record<string, unknown>)?.ArticleId;
    const idList = articleIds ? (Array.isArray(articleIds) ? articleIds : [articleIds]) : [];
    const doiEntry = idList.find(
      (id: Record<string, unknown>) => id["@_IdType"] === "doi",
    ) as Record<string, unknown> | undefined;
    const doi = doiEntry ? String(doiEntry["#text"] ?? doiEntry) : null;

    return { pubmedId: pmid, title, abstract, doi, authors, journal, publicationDate };
  });
}
