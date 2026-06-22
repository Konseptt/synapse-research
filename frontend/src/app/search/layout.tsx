import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search PubMed Studies",
  description:
    "Search biomedical literature in plain English. Synapse translates your question, ranks evidence, and summarizes what published studies say.",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search PubMed Studies · Synapse",
    url: "/search",
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
