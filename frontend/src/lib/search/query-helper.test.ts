import { describe, expect, it } from "vitest";

import { expandSearchQuery, getSearchSuggestions } from "@/lib/search/query-helper";

describe("expandSearchQuery", () => {
  it("maps casual coffee question to searchable terms", () => {
    const result = expandSearchQuery("Is coffee bad for you?");
    expect(result.searchQuery.toLowerCase()).toMatch(/coffee/);
    expect(result.searchQuery.toLowerCase()).not.toMatch(/\byou\b/);
    expect(result.searchQuery).not.toContain("?");
  });

  it("maps masturbation health question without orphan pronouns", () => {
    const result = expandSearchQuery("is masturbating everyday bad for you");
    expect(result.searchQuery.toLowerCase()).toMatch(/masturbation/);
    expect(result.searchQuery.toLowerCase()).not.toMatch(/\byou\b/);
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

  it("does not throw on cure for", () => {
    expect(() => expandSearchQuery("cure for")).not.toThrow();
    const result = expandSearchQuery("cure for");
    expect(result.originalQuery).toBe("cure for");
    expect(result.searchQuery.length).toBeGreaterThan(0);
  });

  it("maps cure compulsive attachement typo to psychology attachment query", () => {
    const result = expandSearchQuery("cure compulsive attachement");
    expect(result.searchQuery.toLowerCase()).toMatch(/attachment style|insecure attachment/);
    expect(result.searchHint).toBe("psychology attachment research");
  });

  it("keeps cure alone as a searchable keyword", () => {
    const result = expandSearchQuery("cure");
    expect(result.searchQuery).toBe("cure");
    expect(result.matchedTopic).toBeUndefined();
  });
});

describe("getSearchSuggestions", () => {
  it("returns topics matching partial input", () => {
    const suggestions = getSearchSuggestions("back pain");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.label.toLowerCase().includes("back"))).toBe(true);
  });
});
