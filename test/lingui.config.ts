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
} satisfies LinguiConfig
