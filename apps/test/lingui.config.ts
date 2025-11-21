import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "@lingui/cli"
import { defineLinguiRouterConfig } from "lingui-react-router/plugin"

const projectDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  locales: ["en", "en-GB", "cs", "it", "pseudo"],
  sourceLocale: "en",
  pseudoLocale: "pseudo",
  catalogs: [
    {
      name: "{locale}",
      path: "<rootDir>/app/locales/{locale}",
      include: ["<rootDir>/app"],
      exclude: ["<rootDir>/app/components/**", "**/*.test.*", "**/__tests__/**"],
    },
    {
      name: "{locale}",
      path: "<rootDir>/app/components/{name}/{name}-{locale}",
      include: ["<rootDir>/app/components/{name}"],
      exclude: ["**/*.test.*"],
    },
  ],
  formatOptions: {
    lineNumbers: false,
  },
  rootDir: projectDir,
})

export const linguiRouterConfig = defineLinguiRouterConfig({
  exclude: ["api"],
  localeParamName: "locale",
  localeMapping: {
    de: "cs",
  },
})
