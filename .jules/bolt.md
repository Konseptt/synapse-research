## 2024-06-24 - HTML Entity Decoding Fast Path
**Learning:** `decodeHtmlEntities` is used pervasively on almost all texts fetched from the backend (25+ instances across components) before rendering. Unconditional chaining of regex replacements is extremely slow, especially on long strings like abstracts.
**Action:** Always add a fast-path early return (`if (!text || !text.includes("&")) return text;`) to entity decoding or any multiple-regex replace functions to skip processing for plain strings, accelerating rendering significantly.

## 2024-06-25 - Avoid Unmemoized Derived State with Timers
**Learning:** Components with interval-based state updates (like cycling placeholders in `SearchBox` using `setInterval`) will trigger a full re-render on every tick. If derived states (like `suggestions` or query `preview` expansions) are calculated on every render without memoization, they will needlessly consume CPU cycles even when their actual inputs haven't changed.
**Action:** Always wrap expensive or complex derived state calculations in `useMemo` when a component contains unrelated timer-based state updates, to prevent unnecessary recalculations on interval ticks.
