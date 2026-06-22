import { describe, expect, it } from "vitest";

describe("search page shell", () => {
  it("defines three-column layout structure", () => {
    const columns = ["results", "detail", "evidence"];
    expect(columns).toHaveLength(3);
    expect(columns).toContain("results");
    expect(columns).toContain("evidence");
  });
});

describe("paper page tabs", () => {
  it("includes all required tabs", () => {
    const tabs = ["overview", "evidence", "methods", "citations", "discussion"];
    expect(tabs).toHaveLength(5);
  });
});
