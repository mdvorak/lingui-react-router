import type { LinguiConfig } from "@lingui/conf"
import { describe, expect, it } from "vitest"
import { localePaths } from "./routes"

describe("localePaths", () => {
  const mockConfig: LinguiConfig = {
    locales: ["en", "cs", "de"],
    fallbackLocales: {},
  } as LinguiConfig

  it("should generate localized paths with default path included", () => {
    const result = localePaths(mockConfig, "/products")

    expect(result).toEqual(["/en/products", "/cs/products", "/de/products", "/products"])
  })

  it("should generate localized paths without default path when withDefault is false", () => {
    const result = localePaths(mockConfig, "/products", false)

    expect(result).toEqual(["/en/products", "/cs/products", "/de/products"])
  })

  it("should handle root path", () => {
    const result = localePaths(mockConfig, "/")

    expect(result).toEqual(["/en/", "/cs/", "/de/", "/"])
  })

  it("should handle nested paths", () => {
    const result = localePaths(mockConfig, "/products/category/item")

    expect(result).toEqual([
      "/en/products/category/item",
      "/cs/products/category/item",
      "/de/products/category/item",
      "/products/category/item",
    ])
  })

  it("should handle single locale configuration", () => {
    const singleLocaleConfig: LinguiConfig = {
      locales: ["en"],
      fallbackLocales: {},
    } as LinguiConfig

    const result = localePaths(singleLocaleConfig, "/about")

    expect(result).toEqual(["/en/about", "/about"])
  })

  it("should handle locales with region codes", () => {
    const regionConfig: LinguiConfig = {
      locales: ["en-US", "en-GB", "fr-FR"],
      fallbackLocales: {},
    } as LinguiConfig

    const result = localePaths(regionConfig, "/contact", false)

    expect(result).toEqual(["/en-us/contact", "/en-gb/contact", "/fr-fr/contact"])
  })

  it("should handle empty path", () => {
    const result = localePaths(mockConfig, "")

    expect(result).toEqual(["/en", "/cs", "/de", ""])
  })
})
