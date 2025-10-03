import { lingui } from "@lingui/vite-plugin"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { linguiRouterPlugin } from "lingui-react-router/plugin"
import { defineConfig } from "vite"
import macrosPlugin from "vite-plugin-babel-macros"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig(async () => {
  return {
    plugins: [
      tailwindcss(),
      reactRouter(),
      macrosPlugin(),
      lingui(),
      linguiRouterPlugin(),
      tsconfigPaths(),
    ],
    build: {
      minify: false,
    },
  }
})
