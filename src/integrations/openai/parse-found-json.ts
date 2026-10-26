/**
 * Pulls a `{"found": true|false, ...}` object out of free-text model output.
 * Real bug found live: despite being told to answer with exactly one JSON
 * object, the model sometimes lists several candidates, each in its own
 * fenced ```json block (e.g. three alternative Alibaba listings). A single
 * greedy `{...}` match then spans from the first `{` to the last `}`,
 * swallowing the markdown in between — `JSON.parse` throws, and the result
 * is silently discarded even when one of the blocks was a valid, real find.
 * This parses every non-nested `{...}` block independently and prefers the
 * first one that claims `found: true`, falling back to the first block that
 * parsed at all (so an honest `found: false` still comes through).
 */
export function parseFirstFoundJson<T extends { found: boolean }>(text: string): T | null {
  const blocks = text.match(/\{[^{}]*\}/g);
  if (!blocks) return null;

  const parsed = blocks
    .map((block) => {
      try {
        return JSON.parse(block) as T;
      } catch {
        return null;
      }
    })
    .filter((p): p is T => p != null && typeof p.found === 'boolean');

  if (!parsed.length) return null;
  return parsed.find((p) => p.found) ?? parsed[0]!;
}
