import type { LinguiConfig } from "@lingui/conf"

export default {
  locales: ["en", "cs", "pseudo"],
  // exclude: "api",
  sourceLocale: "en",
  pseudoLocale: "pseudo",
  fallbackLocales: {
    default: "en",
  },
  catalogs: [
    {
      path: "app/locales/{locale}",
      include: ["app"],
      exclude: ["**/*.test.*", "**/__tests__/**"],
    },
  ],
  format: "po",
} satisfies LinguiConfig
