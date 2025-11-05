import { describe, expect, it, vi } from "vitest"
import * as runtime from "./runtime"

// Mock the virtual loader before importing runtime so runtime.ts uses these values.
vi.mock("virtual:lingui-router-loader", () => ({
  config: {
    locales: ["en", "fr"],
    defaultLocale: "en",
    localeParamName: "locale",
    exclude: [],
  },
  localeMapping: {},
  localeLoaders: {
    en: async () => ({ messages: { greeting: "hello" } }),
    fr: async () => ({ messages: { greeting: "bonjour" } }),
  },
  $useLingui: vi.fn(),
}))

describe("runtime supportedLocales", () => {
  it("builds a Set from loader.config.locales", () => {
    expect(runtime.supportedLocales.has("en")).toBe(true)
    expect(runtime.supportedLocales.has("fr")).toBe(true)
    expect(runtime.supportedLocales.size).toBe(2)
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
