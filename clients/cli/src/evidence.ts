#!/usr/bin/env tsx
// CLI: evidence — ثبت ارزان، triage، review، promote
// F1: ثبت زیر 30 ثانیه؛ F2 payload متنی inline؛ F3 payload باینری فقط ref

import fs from "node:fs";
import path from "node:path";
import { captureFieldObservation, listEvidence, triageEvidence, reviewEvidence, promoteFeedbackToEvidence, linkEvidenceToAsset } from "../../../src/evidence-store.js";
import { listFeedbackQueue } from "../../../src/intake-store.js";
import { getWorkspace, workspaceDir } from "../../../src/workspace.js";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const cmd = process.argv[2];

async function main() {
  if (!cmd || cmd === "help") {
    console.log(`Usage:
  npx tsx clients/cli/src/evidence.ts capture --workspace casio --domain education --text "..." [--source field_observation] [--confidence 0.8] [--ref path/to/file] [--observer process_coach]
  npx tsx clients/cli/src/evidence.ts list --workspace casio [--domain education] [--status unreviewed]
  npx tsx clients/cli/src/evidence.ts triage --workspace casio --id evd_... --class knowledge_gap --dest playbook_001 --priority high --reviewer workspace_owner
  npx tsx clients/cli/src/evidence.ts review --workspace casio --id evd_... --decision accept|reject|needs_more_evidence --reviewer workspace_owner --note "..."
  npx tsx clients/cli/src/evidence.ts promote --workspace casio --feedback fbk_... --promoter workspace_owner
  npx tsx clients/cli/src/evidence.ts link --workspace casio --id evd_... --asset playbook_001
`);
    return;
  }

  const workspace = arg("workspace") ?? "casio";
  const ws = getWorkspace(workspace);
  if (!ws) {
    console.error(`workspace_not_found:${workspace}`);
    process.exit(1);
  }
  const evidencePath = path.join(ws.dir, "evidence", "evidence.json");
  const dataEvidencePath = path.join(ws.dataDirAbs, "evidence.json");
  // Use workspace path as primary (git-tracked), mirror to data
  const primaryPath = evidencePath;

  if (cmd === "capture") {
    const domain = arg("domain") ?? "operations";
    const text = arg("text") ?? arg("summary");
    if (!text) {
      console.error("capture requires --text");
      process.exit(1);
    }
    const source = (arg("source") as any) ?? "field_observation";
    const confidence = arg("confidence") ? Number(arg("confidence")) : 0.5;
    const ref = arg("ref");
    const observer = arg("observer") ?? "process_coach";
    const start = Date.now();
    const result = captureFieldObservation(
      {
        related_domain: domain,
        summary: text,
        source,
        confidence,
        observer,
        payload_ref: ref,
        provenance_idempotency_key: arg("key"),
      },
      workspace,
      primaryPath,
    );
    // Mirror to data
    try {
      captureFieldObservation(
        {
          related_domain: domain,
          summary: text,
          source,
          confidence,
          observer,
          payload_ref: ref,
          provenance_idempotency_key: arg("key"),
        },
        workspace,
        dataEvidencePath,
      );
    } catch {}
    const elapsed = Date.now() - start;
    console.log(`[capture] evidence=${result.evidence.evidence_id} status=${result.evidence.review_status} elapsed=${elapsed}ms`);
    if (elapsed > 30000) console.warn("WARNING: capture took >30s — F1 violated");
    if (ref) {
      if (fs.existsSync(ref)) {
        const stat = fs.statSync(ref);
        if (stat.size > 0) console.log(`[capture] binary ref stored: ${ref} (not committed)`);
      }
      // Check that binary not inside git-tracked evidence dir
      const evidenceDir = path.join(ws.dir, "evidence");
      if (ref.startsWith(evidenceDir) && !ref.endsWith(".json")) {
        console.warn(`[capture] binary inside evidence/ should be gitignored — add to .gitignore`);
      }
    }
  } else if (cmd === "list") {
    const domain = arg("domain");
    const status = arg("status") as any;
    const list = listEvidence({ related_domain: domain, review_status: status }, primaryPath);
    console.log(`[list] count=${list.length}`);
    for (const e of list.slice(0, 20)) {
      console.log(`  ${e.evidence_id} ${e.review_status} ${e.related_domain} confidence=${e.confidence} triage=${(e as any).triage?.evidence_type ?? "-"}`);
    }
    const unreviewed = listEvidence({ review_status: "unreviewed" }, primaryPath).length;
    if (unreviewed > 0) console.log(`[list] unreviewed=${unreviewed} — triage needed`);
  } else if (cmd === "triage") {
    const id = arg("id");
    const evidence_type = (arg("class") ?? arg("type")) as any;
    const dest = arg("dest");
    const destDomain = arg("domain");
    const priority = (arg("priority") as any) ?? "medium";
    const reviewer = arg("reviewer") ?? "workspace_owner";
    if (!id || !evidence_type) {
      console.error("triage requires --id and --class");
      process.exit(1);
    }
    const triaged = triageEvidence(id, { evidence_type, destination_asset: dest, destination_domain: destDomain, priority }, reviewer, primaryPath);
    try { triageEvidence(id, { evidence_type, destination_asset: dest, destination_domain: destDomain, priority }, reviewer, dataEvidencePath); } catch {}
    console.log(`[triage] ${id} → ${evidence_type} dest=${dest ?? destDomain} priority=${priority}`);
  } else if (cmd === "review") {
    const id = arg("id");
    const decision = (arg("decision") as any) ?? "accepted";
    const reviewer = arg("reviewer") ?? "workspace_owner";
    const note = arg("note") ?? arg("reviewNote") ?? "بازبینی";
    if (!id) {
      console.error("review requires --id");
      process.exit(1);
    }
    const map: Record<string, string> = { accept: "accepted", reject: "rejected", needs_more: "needs_more_evidence", acceptd: "accepted" };
    const dec = map[decision] ?? decision;
    const reviewed = reviewEvidence(id, dec as any, reviewer, note, primaryPath);
    try { reviewEvidence(id, dec as any, reviewer, note, dataEvidencePath); } catch {}
    console.log(`[review] ${id} → ${dec}`);
  } else if (cmd === "promote") {
    const fid = arg("feedback") ?? arg("feedback_id") ?? arg("id");
    const promoter = arg("promoter") ?? "workspace_owner";
    if (!fid) {
      console.error("promote requires --feedback <feedback_id>");
      process.exit(1);
    }
    const intakePath = path.join(ws.dataDirAbs, "feedback-intake.json");
    const wsIntakePath = path.join(ws.dir, "feedback", "intake.json");
    let fb: any = null;
    for (const p of [intakePath, wsIntakePath]) {
      if (fs.existsSync(p)) {
        const list = listFeedbackQueue({ limit: 200 }, p);
        fb = list.find((f) => f.id === fid);
        if (fb) break;
      }
    }
    if (!fb) {
      console.error(`feedback not found: ${fid}`);
      process.exit(1);
    }
    const ev = promoteFeedbackToEvidence(fb, workspace, primaryPath);
    try { promoteFeedbackToEvidence(fb, workspace, dataEvidencePath); } catch {}
    console.log(`[promote] feedback ${fid} → evidence ${ev.evidence_id} lineage=${ev.promoted_from_feedback}`);
  } else if (cmd === "link") {
    const id = arg("id");
    const asset = arg("asset");
    if (!id || !asset) {
      console.error("link requires --id <evidence_id> --asset <asset_id>");
      process.exit(1);
    }
    const linked = linkEvidenceToAsset(id, asset, primaryPath);
    try { linkEvidenceToAsset(id, asset, dataEvidencePath); } catch {}
    console.log(`[link] ${id} → ${asset} linked_assets=${linked.linked_assets.join(",")}`);
  } else {
    console.error(`unknown command: ${cmd}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
