import { describe, expect, it } from "vitest"
import { negotiateClientLocale } from "./negotiate"

describe("negotiateClientLocale", () => {
  it("returns exact or primary-language match for en-US header", () => {
    const headers = { "accept-language": "en-US,en;q=0.9" }
    const locales = ["en", "fr"]
    expect(negotiateClientLocale(headers, locales)).toBe("en")
  })

  it("prefers FR for fr-CA header when fr is available", () => {
    const headers = { "accept-language": "fr-CA,fr;q=0.8,en;q=0.6" }
    const locales = ["en", "fr"]
    expect(negotiateClientLocale(headers, locales)).toBe("fr")
  })

  it("returns undefined when no supported locale matches", () => {
    const headers = { "accept-language": "es" }
    const locales = ["en", "fr"]
    expect(negotiateClientLocale(headers, locales)).toBeUndefined()
  })

  it("returns undefined when supported locales list is empty", () => {
    const headers = { "accept-language": "en" }
    const locales: string[] = []
    expect(negotiateClientLocale(headers, locales)).toBeUndefined()
  })
})
