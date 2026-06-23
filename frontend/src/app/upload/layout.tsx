import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload & Analyze PDF",
  description:
    "Upload a research PDF for summary, evidence scoring, and Q&A grounded in the paper text.",
  alternates: { canonical: "/upload" },
};

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
