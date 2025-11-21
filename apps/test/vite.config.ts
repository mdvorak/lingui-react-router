import { lingui } from "@lingui/vite-plugin"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { linguiRouterPlugin } from "lingui-react-router/plugin"
import { defineConfig } from "vite"
import macrosPlugin from "vite-plugin-babel-macros"
import tsconfigPaths from "vite-tsconfig-paths"
import { linguiRouterConfig } from "./lingui.config"

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    macrosPlugin(),
    lingui(),
    linguiRouterPlugin(linguiRouterConfig),
    tsconfigPaths(),
  ],
  build: {
    minify: true,
  },
  // Note this is not needed in the user application. Here it's because we use the lib from a workspace
  ssr: {
    noExternal: ["negotiator"],
  },
})
