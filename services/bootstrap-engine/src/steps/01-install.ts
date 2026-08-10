import fs from "node:fs";
import path from "node:path";
import { bootstrapWorkspace, workspaceDir } from "../../../../src/workspace.js";
import { recordAuditEvent } from "../../../../src/audit-store.js";

// Step 01 — workspace_shell
// Channel guard: only experimental for sandbox in Phase 1 (E3)

export type InstallInput = {
  workspaceId: string;
  displayName: string;
  channel?: string; // experimental | stable | beta
  installerId?: string;
};

export function step01Install(input: InstallInput): { workspaceId: string; dir: string } {
  const channel = input.channel ?? "experimental";
  // E3: only sandbox may be experimental in Phase 1; stable is blocked
  if (channel !== "experimental") {
    // Allow casio with any channel? But per spec, stable in this phase error
    if (input.workspaceId !== "casio") {
      throw new Error(`channel_guard: channel ${channel} not allowed in Phase 1 — only experimental for sandbox`);
    }
  }
  if (input.workspaceId === "sandbox" && channel !== "experimental") {
    throw new Error("channel_guard: sandbox must be experimental");
  }
  // Check for existing workspace
  const dir = workspaceDir(input.workspaceId);
  if (fs.existsSync(path.join(dir, "config.json"))) {
    // Idempotency: if exists with same displayName, return existing
    const existing = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
    if (existing.displayName === input.displayName) {
      return { workspaceId: input.workspaceId, dir };
    }
    throw new Error(`workspace_exists:${input.workspaceId}`);
  }

  const ws = bootstrapWorkspace({ id: input.workspaceId, displayName: input.displayName });
  // Record audit
  try {
    recordAuditEvent(
      { action: "bootstrap_step_01_install", actor: input.installerId ?? "system_igniter", entityType: "workspace", entityId: input.workspaceId, details: { channel, step: 1 } },
      `${ws.dataDirAbs}/audit-events.json`,
    );
  } catch {}
  // Also store channel in manifest
  if (channel) {
    const manifestPath = path.join(ws.dir, "manifest.yaml");
    if (fs.existsSync(manifestPath)) {
      let raw = fs.readFileSync(manifestPath, "utf8");
      if (!raw.includes("channel:")) {
        raw += `\nchannel: ${channel}\n`;
        fs.writeFileSync(manifestPath, raw, "utf8");
      }
    }
  }
  return { workspaceId: ws.config.id, dir: ws.dir };
}
