import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ConvergencePattern = {
  pattern_id: string;
  pattern_type: "cross_workspace_feedback_pattern" | "shared_knowledge_gap";
  domain_class: string;
  asset_class: string;
  workspace_count: number;
  first_seen: string;
  last_seen: string;
  participating_workspaces: string[]; // only ids, per G3
  review_status: "pending_review" | "reviewed" | "dismissed";
  created_at: string;
};

const DEFAULT_PATH = path.resolve("data/platform/convergence-patterns.json");

function ensureStore(filePath: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]\n", "utf8");
}

export function loadPatterns(filePath = DEFAULT_PATH): ConvergencePattern[] {
  ensureStore(filePath);
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`Convergence store must be array: ${filePath}`);
  // Privacy check: ensure no raw_payload
  for (const p of parsed as any[]) {
    if ("raw_payload" in p || "payload" in p) throw new Error("convergence_privacy_violation: raw_payload not allowed");
  }
  return parsed as ConvergencePattern[];
}

function writePatterns(patterns: ConvergencePattern[], filePath: string) {
  ensureStore(filePath);
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(patterns, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, filePath);
}

export function emitPattern(
  input: Omit<ConvergencePattern, "pattern_id" | "created_at" | "first_seen" | "last_seen" | "review_status"> & Partial<Pick<ConvergencePattern, "first_seen" | "last_seen">>,
  filePath = DEFAULT_PATH,
): ConvergencePattern {
  // G1/G3: only metadata, no payload
  if ((input as any).raw_payload || (input as any).payload) throw new Error("convergence_privacy_violation: raw_payload not allowed");
  const patterns = loadPatterns(filePath);
  // Idempotency: same pattern_type + domain_class + asset_class + same participants set → no new pattern
  const key = `${input.pattern_type}:${input.domain_class}:${input.asset_class}:${[...input.participating_workspaces].sort().join(",")}`;
  const existing = patterns.find((p) => `${p.pattern_type}:${p.domain_class}:${p.asset_class}:${[...p.participating_workspaces].sort().join(",")}` === key);
  if (existing) {
    existing.last_seen = new Date().toISOString();
    writePatterns(patterns, filePath);
    return existing;
  }
  const now = new Date().toISOString();
  const pattern: ConvergencePattern = {
    pattern_id: `pat_${randomUUID()}`,
    pattern_type: input.pattern_type,
    domain_class: input.domain_class,
    asset_class: input.asset_class,
    workspace_count: input.participating_workspaces.length,
    first_seen: input.first_seen ?? now,
    last_seen: input.last_seen ?? now,
    participating_workspaces: [...input.participating_workspaces],
    review_status: "pending_review",
    created_at: now,
  };
  if (pattern.workspace_count < 2) throw new Error("workspace_count must be >=2");
  patterns.push(pattern);
  writePatterns(patterns, filePath);
  return pattern;
}

export function listPatterns(filePath = DEFAULT_PATH): ConvergencePattern[] {
  return loadPatterns(filePath);
}

export function reviewPattern(patternId: string, decision: "reviewed" | "dismissed", reviewer: string, filePath = DEFAULT_PATH): ConvergencePattern {
  const patterns = loadPatterns(filePath);
  const idx = patterns.findIndex((p) => p.pattern_id === patternId);
  if (idx < 0) throw new Error(`Pattern not found: ${patternId}`);
  patterns[idx].review_status = decision;
  writePatterns(patterns, filePath);
  return patterns[idx];
}
