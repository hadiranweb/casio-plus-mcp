/**
 * Deterministic text similarity for the quality gate — the fuzzy companion to
 * the exact SHA-256 fingerprint. Same idea as the GenFlow data-cleaning island
 * (`strsim::normalized_levenshtein`), implemented dependency-free so the MCP
 * core stays zero-dep.
 *
 * Pure + deterministic; bounded so long summaries do not blow up the queue.
 */

/** Levenshtein distance with an early length-gap cutoff (returns gap+1). */
export function levenshteinDistance(a: string, b: string, maxDistance = Infinity): number {
  if (a === b) return 0;
  const gap = Math.abs(a.length - b.length);
  if (gap > maxDistance) return maxDistance + 1;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let cur = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > maxDistance) return maxDistance + 1;
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

/**
 * Normalized similarity in [0, 1]: 1 − distance / max(len). 1 = identical,
 * 0 = completely different.
 */
export function normalizedSimilarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshteinDistance(a, b) / max;
}
