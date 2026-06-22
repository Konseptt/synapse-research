import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload & Analyze PDF",
  description:
    "Upload a research PDF for AI-powered summary, evidence scoring, and grounded Q&A with Synapse.",
  alternates: { canonical: "/upload" },
};

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
