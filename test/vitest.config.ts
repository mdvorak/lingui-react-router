import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { lingui } from "@lingui/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { linguiRouterPlugin } from "lingui-react-router/plugin"
import macrosPlugin from "vite-plugin-babel-macros"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"
import { linguiRouterConfig } from "./lingui.config"

const projectDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    {
      name: "lingui-config-file",
      enforce: "pre",
      buildStart() {
        // When running as nested vitest project, lingui fails to resolve the config file
        // even that cwd is set in its config. Bug is in the macrosPlugin.
        process.env.LINGUI_CONFIG = path.resolve(projectDir, "lingui.config.ts")
      },
    },
    tailwindcss(),
    macrosPlugin(),
    lingui({ cwd: projectDir }),
    linguiRouterPlugin(linguiRouterConfig),
    tsconfigPaths(),
  ],
  test: {
    name: "test",
    globals: true,
    environment: "happy-dom",
    reporters: ["default", "github-actions"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/.git/**", "coverage/**", "build/**"],
    coverage: {
      reporter: ["text"],
      allowExternal: true,
      exclude: ["build/**", ".react-router/**", "integration-tests/**", "**/*.po"],
    },
  },
})
