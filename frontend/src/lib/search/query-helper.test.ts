import { describe, expect, it } from "vitest";

import { expandSearchQuery, getSearchSuggestions } from "@/lib/search/query-helper";

describe("expandSearchQuery", () => {
  it("maps casual coffee question to searchable terms", () => {
    const result = expandSearchQuery("Is coffee bad for you?");
    expect(result.searchQuery.toLowerCase()).toMatch(/coffee/);
    expect(result.searchQuery).not.toContain("?");
  });

  it("maps high blood pressure phrase", () => {
    const result = expandSearchQuery("how to lower high blood pressure");
    expect(result.searchQuery.toLowerCase()).toContain("hypertension");
  });

  it("matches popular topic aliases", () => {
    const result = expandSearchQuery("cant sleep");
    expect(result.matchedTopic?.label.toLowerCase()).toContain("insomnia");
  });

  it("does not remap a single keyword to an unrelated popular topic", () => {
    const result = expandSearchQuery("depression");
    expect(result.searchQuery).toBe("depression");
    expect(result.matchedTopic).toBeUndefined();
  });

  it("strips question words but keeps keywords", () => {
    const result = expandSearchQuery("does walking help depression");
    expect(result.searchQuery.toLowerCase()).toMatch(/walk|depression/);
  });

  it("maps attachment issues to psychology research not biomedical attach", () => {
    const result = expandSearchQuery("how to overcome attachment issues");
    expect(result.searchQuery.toLowerCase()).toMatch(/attachment style|insecure attachment/);
    expect(result.searchHint).toBe("psychology attachment research");
  });
});

describe("getSearchSuggestions", () => {
  it("returns topics matching partial input", () => {
    const suggestions = getSearchSuggestions("back pain");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.label.toLowerCase().includes("back"))).toBe(true);
  });
});
