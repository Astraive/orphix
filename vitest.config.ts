import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/out/**", "**/target/**"],
    projects: [
      {
        test: {
          name: "packages",
          include: ["packages/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "apis",
          include: ["apis/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "desktop",
          include: ["apps/desktop/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "convex",
          include: ["convex/**/*.test.ts"],
        },
      },
    ],
  },
});
