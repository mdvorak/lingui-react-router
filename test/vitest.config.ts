import tailwindcss from "@tailwindcss/vite"
import { linguiRouterPlugin } from "lingui-react-router/plugin"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"
import { linguiRouterConfig } from "./lingui.config"
import macrosPlugin from "vite-plugin-babel-macros"
import { lingui } from "@lingui/vite-plugin"

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
  },
})
