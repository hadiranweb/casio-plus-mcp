import { listPatterns, reviewPattern } from "./pattern-store.js";

export function generateReport(filePath?: string) {
  const patterns = listPatterns(filePath);
  return {
    total: patterns.length,
    pending: patterns.filter((p) => p.review_status === "pending_review").length,
    patterns,
    convergence_activation: patterns.length > 0 ? "active" : "pending_second_real_workspace",
  };
}

export { reviewPattern };
