import { step01Install } from "./steps/01-install.js";
import { step02Ask } from "./steps/02-ask.js";
import { step03Map } from "./steps/03-map.js";
import { step04AssignOwners } from "./steps/04-assign-owners.js";
import { step05CreateStructures } from "./steps/05-create-structures.js";
import { step06EnableWorkflows } from "./steps/06-enable-workflows.js";
import { step07Exit } from "./steps/07-exit.js";

/**
 * Bootstrap Engine — اجرای ۷ گام installer-protocol به صورت دستی هدایت‌شده (E2)
 * هر گام قابل توقف/بازبینی است؛ اجرای خودکار یک‌جا ممنوع.
 */

export type BootstrapOptions = {
  workspaceId: string;
  displayName: string;
  channel?: string;
  installerId?: string;
};

export async function runBootstrap(opts: BootstrapOptions): Promise<{ workspaceId: string; bootstrap_run_id: string }> {
  const installerId = opts.installerId ?? `hadiranweb:${new Date().toISOString().slice(0, 10)}`;

  // Step 01
  step01Install({ workspaceId: opts.workspaceId, displayName: opts.displayName, channel: opts.channel ?? "experimental", installerId });

  // Step 02
  step02Ask(opts.workspaceId, installerId);

  // Step 03
  step03Map(opts.workspaceId, installerId);

  // Step 04
  step04AssignOwners(opts.workspaceId, installerId);

  // Step 05
  step05CreateStructures(opts.workspaceId, installerId);

  // Step 06
  step06EnableWorkflows(opts.workspaceId, installerId);

  // Step 07
  const result = step07Exit(opts.workspaceId, installerId);

  return { workspaceId: opts.workspaceId, bootstrap_run_id: result.bootstrap_run_id };
}

// Individual step exports for manual guided execution (E2)
export { step01Install, step02Ask, step03Map, step04AssignOwners, step05CreateStructures, step06EnableWorkflows, step07Exit };
