import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    name: "src",
    globals: true,
    environment: "node",
    reporters: ["default", "github-actions"],
    include: ["src/**/*.test.ts"],
    coverage: {
      reporter: ["text"],
      exclude: ["apps/*/build/**", "apps/*/.react-router/**", "apps/*/integration-tests/**", "**/*.po"],
    },
  },
})
