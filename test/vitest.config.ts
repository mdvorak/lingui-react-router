import { lingui } from "@lingui/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { linguiRouterPlugin } from "lingui-react-router/plugin"
import macrosPlugin from "vite-plugin-babel-macros"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"
import { linguiRouterConfig } from "./lingui.config"

export default defineConfig({
  plugins: [
    tailwindcss(),
    macrosPlugin(),
    lingui(),
    linguiRouterPlugin(linguiRouterConfig),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: "happy-dom",
    exclude: ["**/node_modules/**", "build/**", ".react-router/**"],
    reporters: ["default", "github-actions"],
  },
})
