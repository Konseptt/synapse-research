import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research Knowledge Graph",
  description:
    "Explore how papers, topics, and authors connect. Visualize relationships in your research library.",
  alternates: { canonical: "/graph" },
};

export default function GraphLayout({ children }: { children: React.ReactNode }) {
  return children;
}
