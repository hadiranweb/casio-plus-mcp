import { describe, expect, it } from "vitest";
import { levenshteinDistance, normalizedSimilarity } from "../services/mcp-server/src/text-similarity.js";

describe("text similarity", () => {
  it("computes levenshtein distance", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    expect(levenshteinDistance("abc", "abc")).toBe(0);
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
  });

  it("returns identical for equal strings and 0-ish for very different ones", () => {
    expect(normalizedSimilarity("same text", "same text")).toBe(1);
    expect(normalizedSimilarity("a", "b")).toBe(0);
    expect(normalizedSimilarity("", "")).toBe(1);
  });

  it("recognizes near-duplicate field observations", () => {
    const a = "دانش‌پذیر در تشخیص گلوگاه فروش مشکل داشت و به مثال عملی بیشتری در فرم جلسه کوچینگ نیاز دارد.";
    const b = "دانش‌پذیر در تشخیص گلوگاه فروش مشکل داشت و به مثال عملی بیشتری در فرم جلسه کوچینگ نیاز دارد. ";
    const c = "مشاهده کاملاً متفاوت درباره بودجه‌بندی کمپین و هزینه‌های تبلیغات در کانال بله.";
    expect(normalizedSimilarity(a, b)).toBeGreaterThanOrEqual(0.95);
    expect(normalizedSimilarity(a, c)).toBeLessThan(0.5);
  });

  it("respects the maxDistance bound and exits early", () => {
    expect(levenshteinDistance("short", "a very long string indeed", 3)).toBeGreaterThan(3);
  });
});
