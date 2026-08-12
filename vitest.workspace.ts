import { defineProject } from "vitest/config";

/** Foundation project; later sprints can add isolated test projects here. */
export default defineProject({
  test: {
    name: "foundation",
    environment: "node",
    include: ["packages/**/src/**/*.test.ts", "tests/contracts/**/*.test.ts"],
  },
});
