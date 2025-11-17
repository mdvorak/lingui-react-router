import { defineConfig } from "@lingui/cli"
import { defineLinguiRouterConfig } from "lingui-react-router/plugin"

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
      path: "app/components/{name}/{name}-{locale}",
      include: ["app/components/{name}"],
      exclude: ["**/*.test.*"],
    },
  ],
  formatOptions: {
    lineNumbers: false,
  },
})

export const linguiRouterConfig = defineLinguiRouterConfig({
  exclude: ["api"],
  localeParamName: "locale",
  localeMapping: {
    de: "cs",
  },
})
