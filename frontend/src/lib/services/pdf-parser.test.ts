import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { extractPdfText } from "@/lib/services/pdf";

describe("pdf parser", () => {
  it("extracts text from a generated PDF", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText("Synapse test document for PDF parsing.", {
      x: 50,
      y: 700,
      size: 12,
      font,
    });
    const bytes = await doc.save();
    const text = await extractPdfText(Buffer.from(bytes));
    expect(text.toLowerCase()).toContain("synapse");
  });
});
