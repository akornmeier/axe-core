import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: false,
    projects: [
      {
        test: {
          name: "contracts",
          environment: "node",
          include: ["test/contracts/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "host",
          environment: "node",
          include: ["test/host/**/*.test.ts"],
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
      {
        test: {
          name: "playbooks",
          environment: "node",
          include: ["test/playbooks/**/*.test.ts"],
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
