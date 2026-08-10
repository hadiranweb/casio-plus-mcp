/**
 * Branding — the platform identity shown by the Operator UI.
 *
 * The platform is the brand-agnostic "Element Ecosystem" (اکوسیستم عنصر);
 * each deployed workspace shows its own displayName from the workspace
 * config (workspaces/<id>/config.json) — so the casio deployment shows
 * "کاسیو پلاس" while another organization shows its own name.
 */

import fs from 'node:fs';
import path from 'node:path';

export const PLATFORM_NAME_EN = 'Element Ecosystem';
export const PLATFORM_NAME_FA = 'اکوسیستم عنصر';

export type Branding = {
  platformName: string; // e.g. "Element Ecosystem"
  workspaceName: string; // e.g. "کاسیو پلاس"
  workspaceId: string;
};

function workspaceConfigPath(): string {
  const id = process.env.CASIO_WORKSPACE ?? 'casio';
  return path.resolve(process.cwd(), '..', 'workspaces', id, 'config.json');
}

export function loadBranding(): Branding {
  const id = process.env.CASIO_WORKSPACE ?? 'casio';
  let displayName = id;
  try {
    const raw = fs.readFileSync(workspaceConfigPath(), 'utf8');
    const config = JSON.parse(raw) as { displayName?: string };
    if (config.displayName && config.displayName.trim()) displayName = config.displayName.trim();
  } catch {
    // fall back to the workspace id when config is missing
  }
  return { platformName: PLATFORM_NAME_EN, workspaceName: displayName, workspaceId: id };
}
