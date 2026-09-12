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
    ],
  },
});
