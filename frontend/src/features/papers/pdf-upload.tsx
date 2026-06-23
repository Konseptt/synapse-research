"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { uploadPaper } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const PDF_MAX_MB = 25;

function validatePdfClient(file: File): string | null {
  if (file.size > PDF_MAX_MB * 1024 * 1024) {
    return `PDF must be under ${PDF_MAX_MB} MB. Choose a smaller file.`;
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Only PDF files are accepted.";
  }
  return null;
}

interface PdfUploadProps {
  className?: string;
  compact?: boolean;
}

export function PdfUpload({ className, compact }: PdfUploadProps) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const validationError = validatePdfClient(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setUploading(true);
      try {
        const result = await uploadPaper(file);
        router.push(`/paper/${result.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [router],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-sm border border-dashed p-6 text-center transition-colors",
          dragging ? "border-accent bg-accent-soft/40" : "border-rule bg-surface-elevated",
          compact && "p-4",
        )}
      >
        <p className="text-sm text-ink-muted">
          {uploading ? "Uploading and extracting text…" : "Drop a PDF here, or choose a file"}
        </p>
        <p className="mt-1 text-xs text-ink-faint">PDF only, max 25 MB. Analysis starts automatically.</p>
        <label className="mt-4 inline-block cursor-pointer rounded-sm border border-rule bg-surface-elevated px-4 py-2 text-sm font-medium text-ink hover:border-accent-muted">
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          Choose PDF
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
