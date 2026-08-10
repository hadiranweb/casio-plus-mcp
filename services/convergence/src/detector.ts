import { emitPattern, loadPatterns } from "./pattern-store.js";
import fs from "node:fs";
import path from "node:path";

// Detector — قواعد اولیه، فقط روی workspaces opt-in و نه sandbox

type EvidenceMeta = { workspace_id: string; domain: string; asset_type: string; observed_at: string };

function isSandbox(wsId: string): boolean {
  return wsId === "sandbox";
}

export function detectFeedbackPattern(metas: EvidenceMeta[], filePath?: string): ReturnType<typeof emitPattern> | null {
  // Rule 1: ≥2 workspace opt-in, same feedback type + asset class, within 30 days
  const byKey = new Map<string, EvidenceMeta[]>();
  for (const m of metas) {
    if (isSandbox(m.workspace_id)) continue; // G4: sandbox not counted for real convergence
    const key = `${m.domain}:${m.asset_type}`;
    const arr = byKey.get(key) ?? [];
    arr.push(m);
    byKey.set(key, arr);
  }
  for (const [key, arr] of byKey) {
    const workspaces = [...new Set(arr.map((m) => m.workspace_id))];
    if (workspaces.length >= 2) {
      // Check 30-day window
      const times = arr.map((m) => new Date(m.observed_at).getTime()).sort();
      const windowOk = times[times.length - 1] - times[0] <= 30 * 24 * 60 * 60 * 1000;
      if (!windowOk) continue;
      const [domain, asset] = key.split(":");
      return emitPattern(
        {
          pattern_type: "cross_workspace_feedback_pattern",
          domain_class: domain,
          asset_class: asset,
          workspace_count: workspaces.length,
          participating_workspaces: workspaces,
        },
        filePath,
      );
    }
  }
  return null;
}

export function detectKnowledgeGap(metas: { workspace_id: string; domain: string; asset_class: string; status: string }[], filePath?: string): ReturnType<typeof emitPattern> | null {
  // Rule 2: ≥2 workspace in same domain_class with field_discovery_required for same asset_class
  const byKey = new Map<string, string[]>();
  for (const m of metas) {
    if (isSandbox(m.workspace_id)) continue;
    if (m.status !== "field_discovery_required") continue;
    const key = `${m.domain}:${m.asset_class}`;
    const arr = byKey.get(key) ?? [];
    if (!arr.includes(m.workspace_id)) arr.push(m.workspace_id);
    byKey.set(key, arr);
  }
  for (const [key, workspaces] of byKey) {
    if (workspaces.length >= 2) {
      const [domain, asset] = key.split(":");
      return emitPattern(
        {
          pattern_type: "shared_knowledge_gap",
          domain_class: domain,
          asset_class: asset,
          workspace_count: workspaces.length,
          participating_workspaces: workspaces,
        },
        filePath,
      );
    }
  }
  return null;
}
