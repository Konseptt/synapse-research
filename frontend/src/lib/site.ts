/** Public site config for SEO, OG tags, and JSON-LD. */
export const siteConfig = {
  name: "Synapse",
  title: "Synapse | Health Research From Real Studies",
  tagline: "From published studies",
  description:
    "Ask health and science questions in plain English. Synapse searches PubMed, ranks evidence, and summarizes what published studies say. Free, no account required.",
  keywords: [
    "health research",
    "PubMed search",
    "medical studies",
    "evidence-based medicine",
    "scientific literature",
    "flu vaccine research",
    "health questions",
    "study summary",
    "biomedical research",
    "systematic review",
  ],
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001"),
  locale: "en_US",
  twitterHandle: undefined as string | undefined,
} as const;

export function absoluteUrl(path: string): string {
  const base = siteConfig.url;
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
