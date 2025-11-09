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
      exclude: ["test/build/**", "test/.react-router/**", "test/integration-tests/**", "**/*.po"],
    },
  },
})
