import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const moduleDir = path.dirname(new URL(import.meta.url).pathname);
export const DEFAULT_AUDIT_PATH = path.resolve(moduleDir, "../data/audit-events.json");

export type AuditEvent = {
  id: string;
  occurredAt: string;
  action: string;
  actor: string;
  entityType: "feedback" | "version_proposal" | "domain" | "evidence" | "automation_spec" | "workspace" | "asset";
  entityId: string;
  details: Record<string, unknown>;
};

function ensureStore(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]\n", "utf8");
}

function readEvents(filePath: string): AuditEvent[] {
  ensureStore(filePath);
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`Audit store must contain a JSON array: ${filePath}`);
  return parsed as AuditEvent[];
}

function writeEvents(events: AuditEvent[], filePath: string): void {
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(events, null, 2)}\n`, "utf8");
  fs.renameSync(temp, filePath);
}

export function recordAuditEvent(
  event: Omit<AuditEvent, "id" | "occurredAt">,
  filePath = DEFAULT_AUDIT_PATH,
): AuditEvent {
  const events = readEvents(filePath);
  const created: AuditEvent = { id: `audit_${randomUUID()}`, occurredAt: new Date().toISOString(), ...event };
  events.push(created);
  writeEvents(events, filePath);
  return created;
}

export function listAuditEvents(limit = 50, filePath = DEFAULT_AUDIT_PATH): AuditEvent[] {
  return readEvents(filePath)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, Math.min(Math.max(limit, 1), 200));
}
