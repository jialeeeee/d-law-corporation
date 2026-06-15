// Defensive JSON parsing for model output (agent.md §0.4).
// Agnes may not support `response_format`, and models sometimes wrap JSON in
// markdown fences or add stray prose. parseJson() recovers the JSON payload.

/**
 * Parse a model's text response as JSON, tolerating markdown code fences and
 * leading/trailing prose. Throws a descriptive error if no valid JSON is found.
 */
export function parseJson<T = unknown>(raw: string): T {
  if (!raw || !raw.trim()) {
    throw new Error("parseJson: empty model response");
  }

  let text = raw.trim();

  // 1) Prefer the contents of a ```json ... ``` (or ``` ... ```) fence if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) {
    text = fence[1].trim();
  } else {
    // 2) Otherwise slice to the outermost JSON object/array.
    const firstObj = text.indexOf("{");
    const firstArr = text.indexOf("[");
    const candidates = [firstObj, firstArr].filter((i) => i !== -1);
    const start = candidates.length ? Math.min(...candidates) : -1;
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (start !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(
      `parseJson: model output was not valid JSON — ${(err as Error).message}`,
    );
  }
}
