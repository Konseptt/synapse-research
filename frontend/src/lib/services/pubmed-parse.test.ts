import { describe, expect, it } from "vitest";

import { xmlText } from "@/lib/services/pubmed-parse";

describe("xmlText", () => {
  it("extracts nested italic title text", () => {
    const title = {
      i: [{ "#text": "β" }, { "#text": "-Sn" }],
      "#text": " grains in die-attach solder",
    };
    expect(xmlText(title)).toContain("β");
    expect(xmlText(title)).not.toContain("[object Object]");
  });

  it("joins abstract sections", () => {
    const abstract = [
      { "#text": "Background. ", "@_Label": "BACKGROUND" },
      { "#text": "Methods were used." },
    ];
    expect(xmlText(abstract)).toBe("Background. Methods were used.");
  });
});
