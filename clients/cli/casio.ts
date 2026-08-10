#!/usr/bin/env tsx
// Stub CLI — در فاز واقعی MCP stdio client می‌شود
import { listWorkspaces, workspaceSummary } from "../../src/workspace.js";

const [cmd, sub] = process.argv.slice(2);

if (cmd === "workspace" && sub === "list") {
  const all = listWorkspaces();
  console.log(JSON.stringify({ count: all.length, workspaces: all.map(workspaceSummary) }, null, 2));
} else {
  console.log(`Usage:
  npx tsx clients/cli/casio.ts workspace list
  npx tsx clients/installer/install.ts --id acme --displayName "Acme Co"
`);
}
