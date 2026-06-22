/** Extract plain text from PubMed XML JSON nodes (handles nested i/b/sub/sup and #text). */
export function xmlText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(xmlText).join("");
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const parts: string[] = [];
    for (const key of Object.keys(obj)) {
      if (key.startsWith("@_")) continue;
      if (key === "#text") {
        parts.push(String(obj[key] ?? ""));
      } else {
        parts.push(xmlText(obj[key]));
      }
    }
    return parts.join("");
  }
  return "";
}
