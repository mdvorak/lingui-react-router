import { describe, expect, it, vi } from "vitest"
import * as runtime from "./runtime"

// Mock the virtual loader before importing runtime so runtime.ts uses these values.
vi.mock("virtual:lingui-router-loader", () => ({
  config: {
    locales: ["en", "fr", "pseudo-pseudo"],
    defaultLocale: "en",
    pseudoLocale: "pseudo-pseudo",
    localeParamName: "locale",
    exclude: [],
  },
  localeMapping: {},
  localeLoaders: {
    en: async () => ({ messages: { greeting: "hello" } }),
    fr: async () => ({ messages: { greeting: "bonjour" } }),
    "pseudo-pseudo": async () => ({ messages: { greeting: "pseudo" } }),

  },
  $useLingui: vi.fn(),
}))

describe("runtime supportedLocales", () => {
  it("builds a Set from loader.config.locales", () => {
    expect(runtime.supportedLocales.has("en")).toBe(true)
    expect(runtime.supportedLocales.has("fr")).toBe(true)
    expect(runtime.supportedLocales.has("pseudo-pseudo")).toBe(true)
    expect(runtime.supportedLocales.size).toBe(3)
  })
})

describe("loadLocaleCatalog", () => {
  it("loads messages for a supported locale", async () => {
    const messages = await runtime.loadLocaleCatalog("en")
    expect(messages).toEqual({ greeting: "hello" })
  })

  it("throws when locale has no loader", async () => {
    await expect(runtime.loadLocaleCatalog("de")).rejects.toThrow("Locale 'de' is not supported")
  })
})

describe("runtime userLocales", () => {
  it("returns all locales except pseudoLocale", () => {
    expect(runtime.userLocales).toEqual(["en", "fr"])
  })
})
