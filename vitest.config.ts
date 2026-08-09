import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Scope the root test run to the MCP server's own suite. The operator/ and
    // studio/ workspaces each have their own vitest setup and must be run from
    // their own directories — without this, `npm test` at the root picks up
    // their tests and fails (they expect their workspace cwd/config).
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
