import { defineConfig } from "@lingui/cli"

export default defineConfig({
  locales: ["en", "cs", "it", "pseudo"],
  sourceLocale: "en",
  pseudoLocale: "pseudo",
  fallbackLocales: {
    default: "en",
    "cs-CZ": ["cs"],
  },
  catalogs: [
    {
      name: "{locale}",
      path: "app/locales/{locale}",
      include: ["app"],
      exclude: ["app/components/**", "**/*.test.*", "**/__tests__/**"],
    },
    {
      name: "{locale}",
      path: "app/components/{name}/{name}-{locale}",
      include: ["app/components/{name}"],
      exclude: ["**/*.test.*"],
    },
  ],
  format: "po",
})
