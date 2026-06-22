"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { copyApaCitation, doiUrl, pubmedUrl } from "@/lib/citations/format-citation";
import type { PaperSummary } from "@/types/paper";

interface PaperMetadataProps {
  paper: Pick<PaperSummary, "doi" | "pubmedId" | "publicationDate" | "title" | "authors" | "journal">;
  showCopyCitation?: boolean;
}

export function PaperMetadata({ paper, showCopyCitation }: PaperMetadataProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyApaCitation(paper);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {paper.pubmedId && (
        <a href={pubmedUrl(paper.pubmedId)} target="_blank" rel="noopener noreferrer">
          <Badge variant="outline" className="font-mono hover:border-accent-muted">
            PMID {paper.pubmedId}
          </Badge>
        </a>
      )}
      {paper.doi && (
        <a href={doiUrl(paper.doi)} target="_blank" rel="noopener noreferrer">
          <Badge variant="outline" className="font-mono hover:border-accent-muted">
            DOI
          </Badge>
        </a>
      )}
      {paper.publicationDate && (
        <Badge variant="outline">{paper.publicationDate.slice(0, 4)}</Badge>
      )}
      {showCopyCitation && (
        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCopy}>
          {copied ? "Copied" : "Copy citation"}
        </Button>
      )}
    </div>
  );
}
