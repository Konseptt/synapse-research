import { describe, expect, it } from "vitest";

import {
  extractConflictOfInterest,
  extractFunding,
  resolveDisclosure,
} from "@/lib/services/disclosure-extract";

describe("disclosure-extract", () => {
  it("extracts labeled conflict of interest section", () => {
    const text =
      "Background: Methods here.\nCONFLICT OF INTEREST: The authors declare no competing interests.";
    expect(extractConflictOfInterest(text)).toMatch(/no competing interests/i);
  });

  it("extracts funding section", () => {
    const text = "Results shown. Funding: Supported by NIH grant R01MH12345.";
    expect(extractFunding(text)).toMatch(/NIH grant R01MH12345/);
  });

  it("prefers stored analysis over abstract regex", () => {
    const abstract = "Funding: NIH grant.";
    expect(resolveDisclosure("Industry sponsored trial", abstract, "funding")).toBe(
      "Industry sponsored trial",
    );
  });

  it("returns null when nothing is found", () => {
    expect(extractConflictOfInterest("Methods and results only.")).toBeNull();
  });
});
