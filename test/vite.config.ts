import { lingui } from "@lingui/vite-plugin"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { linguiRouterPlugin } from "lingui-react-router/plugin"
import { defineConfig } from "vite"
import macrosPlugin from "vite-plugin-babel-macros"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    macrosPlugin(),
    lingui(),
    linguiRouterPlugin({
      // These are defaults
      detectLocale: true,
      redirect: "auto",
    }),
    tsconfigPaths(),
  ],
  build: {
    minify: false,
  },
  // Note this is not needed in the user application, here it's because we use the lib from workspace
  ssr: {
    noExternal: ["negotiator"],
  },
})
