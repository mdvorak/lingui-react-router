import { loadInitialLocale } from "lingui-react-router/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { i18n } from "@lingui/core"

function resetLocale() {
  if (i18n.locale) {
    i18n.loadAndActivate({ locale: "", messages: {} })
  }
}

describe("loadInitialLocale", () => {
  beforeEach(() => {
    resetLocale()
    expect(i18n.locale).toBe("")
  })
  afterEach(resetLocale)

  it("should load initial locale 'en' correctly", async () => {
    await loadInitialLocale("/en/home")
    expect(i18n.locale).toBe("en")
    expect(Object.values(i18n.messages)).toContainEqual(["Hello, World!"])
  })

  it("should load initial locale 'it' correctly", async () => {
    await loadInitialLocale("/it/home")
    expect(i18n.locale).toBe("it")
    expect(Object.values(i18n.messages)).toContainEqual(["Ciao, mondo!"])
  })

  it("should load default locale correctly", async () => {
    await loadInitialLocale("/home")
    expect(i18n.locale).toBe("en")
    expect(Object.values(i18n.messages)).toContainEqual(["Hello, World!"])
  })

  it("should load default locale when unsupported locale", async () => {
    await loadInitialLocale("/fr/home")

    // Note: loadInitialLocale is not the one that should validate the locale,
    // it simply initializes the global instance.
    // localeMiddleware returns 404 for unsupported locales.
    expect(i18n.locale).toBe("en")
    expect(Object.values(i18n.messages)).toContainEqual(["Hello, World!"])
  })
})
