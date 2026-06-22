"use client";

import Link from "next/link";

import { PdfUpload } from "@/features/papers/pdf-upload";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-10 lg:px-8 lg:py-14">
      <p className="label-caps mb-2">Upload</p>
      <h1 className="font-serif text-2xl font-medium text-ink">Analyze your own PDF</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        Upload a paper you already have. Synapse extracts the text, summarizes it, scores the
        evidence, and lets you ask questions about it.
      </p>
      <PdfUpload className="mt-8" />
      <p className="mt-6 text-xs text-ink-faint">
        Prefer PubMed search?{" "}
        <Link href="/search" className="font-medium text-accent hover:text-accent-hover">
          Go to search →
        </Link>
      </p>
    </div>
  );
}
