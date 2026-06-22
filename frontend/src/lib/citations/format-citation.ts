import type { PaperDetail, PaperSummary } from "@/types/paper";

type CitablePaper = Pick<
  PaperDetail | PaperSummary,
  "title" | "authors" | "journal" | "publicationDate" | "doi" | "pubmedId"
>;

export function pubmedUrl(pubmedId: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pubmedId}/`;
}

export function doiUrl(doi: string): string {
  const normalized = doi.replace(/^https?:\/\/doi\.org\//i, "");
  return `https://doi.org/${normalized}`;
}

export function formatApaCitation(paper: CitablePaper): string {
  const authors = paper.authors?.length
    ? paper.authors.slice(0, 6).join(", ")
    : "Unknown authors";
  const year = paper.publicationDate?.slice(0, 4) ?? "n.d.";
  const journal = paper.journal ? ` ${paper.journal}.` : "";
  const doi = paper.doi ? ` https://doi.org/${paper.doi.replace(/^https?:\/\/doi\.org\//i, "")}` : "";
  return `${authors} (${year}). ${paper.title}.${journal}${doi}`;
}

export function formatRisRecord(paper: CitablePaper & { id?: string }): string {
  const lines = ["TY  - JOUR", `TI  - ${paper.title}`];
  for (const author of paper.authors ?? []) {
    lines.push(`AU  - ${author}`);
  }
  if (paper.journal) lines.push(`JO  - ${paper.journal}`);
  if (paper.publicationDate) {
    lines.push(`PY  - ${paper.publicationDate.slice(0, 4)}`);
    lines.push(`DA  - ${paper.publicationDate.slice(0, 10)}`);
  }
  if (paper.doi) lines.push(`DO  - ${paper.doi.replace(/^https?:\/\/doi\.org\//i, "")}`);
  if (paper.pubmedId) lines.push(`AN  - ${paper.pubmedId}`);
  lines.push("ER  - ");
  return lines.join("\n");
}

export function exportRisFile(papers: CitablePaper[], filename = "synapse-export.ris"): void {
  const content = papers.map((p) => formatRisRecord(p)).join("\n");
  downloadTextFile(content, filename, "application/x-research-info-systems");
}

export function copyApaCitation(paper: CitablePaper): Promise<void> {
  return navigator.clipboard.writeText(formatApaCitation(paper));
}

function downloadTextFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
