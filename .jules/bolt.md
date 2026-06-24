## 2024-06-24 - HTML Entity Decoding Fast Path
**Learning:** `decodeHtmlEntities` is used pervasively on almost all texts fetched from the backend (25+ instances across components) before rendering. Unconditional chaining of regex replacements is extremely slow, especially on long strings like abstracts.
**Action:** Always add a fast-path early return (`if (!text || !text.includes("&")) return text;`) to entity decoding or any multiple-regex replace functions to skip processing for plain strings, accelerating rendering significantly.
