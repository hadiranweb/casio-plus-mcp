// Router — workspace_id → context (Island Router) with explicit error + fallback alias
import { getWorkspace, loadWorkspace, defaultWorkspaceId } from "../../../src/workspace.js";

export function resolveWorkspaceId(input?: string, alias?: string): string {
  // Support both workspace and workspace_id params, default casio per spec table
  const raw = input ?? alias ?? defaultWorkspaceId();
  const ws = getWorkspace(raw);
  if (!ws) throw new Error(`workspace_not_found:${raw} — create it with create_workspace first`);
  return ws.config.id;
}

export { getWorkspace, loadWorkspace, defaultWorkspaceId } from "../../../src/workspace.js";
