import { describe, expect, it } from "vitest"
import { addToList, linguiRouterPlugin } from "./plugin"

describe("addToList", () => {
  it("should create a new array with the value when list is undefined", () => {
    const result = addToList(undefined, "test")
    expect(result).toEqual(["test"])
  })

  it("should add value to an existing array", () => {
    const result = addToList(["existing"], "new")
    expect(result).toEqual(["existing", "new"])
  })

  it("should convert a single value to an array with both values", () => {
    const result = addToList("existing", "new")
    expect(result).toEqual(["existing", "new"])
  })

  it("should handle multiple values in existing array", () => {
    const result = addToList(["first", "second"], "third")
    expect(result).toEqual(["first", "second", "third"])
  })

  it("should not mutate the original array", () => {
    const original = ["original"]
    const result = addToList(original, "new")
    expect(original).toEqual(["original"])
    expect(result).toEqual(["original", "new"])
    expect(result).not.toBe(original)
  })

  it("should work with different types", () => {
    const result = addToList([1, 2], 3)
    expect(result).toEqual([1, 2, 3])
  })
})

describe("linguiRouterPlugin - configResolved", () => {
  const mockLinguiConfig = {
    locales: ["zn", "es"],
    pseudoLocale: "custom-PSEUDO",
  }

  it("should use defaults when no plugin config is provided", () => {
    const plugin = linguiRouterPlugin({
      linguiConfig: {} as any,
    })
    const config = {
      root: "/test",
    } as unknown as any

    plugin.configResolved(config)

    expect(config.linguiRouterConfig).toEqual({
      linguiConfig: expect.any(Object),
      exclude: [],
      detectLocale: true,
      redirect: "auto",
      localeMapping: {},
      localeParamName: "locale",
      defaultLocale: "und",
      locales: [],
      pseudoLocale: undefined,
    })
  })

  it("should use custom configuration values", () => {
    const plugin = linguiRouterPlugin({
      linguiConfig: mockLinguiConfig as any,
      exclude: ["/admin"],
      detectLocale: false,
      redirect: "never",
      localeMapping: { "en-US": "en", "fr-FR": "fr" },
      localeParamName: "lang",
      defaultLocale: "fr",
      locales: ["en", "fr", "de"],
      pseudoLocale: "pseudo",
    })

    const config = {
      root: "/test",
    } as unknown as any

    plugin.configResolved(config)

    expect(config.linguiRouterConfig).toEqual({
      linguiConfig: mockLinguiConfig,
      exclude: ["/admin"],
      detectLocale: false,
      redirect: "never",
      localeMapping: { "en-us": "en", "fr-fr": "fr" },
      localeParamName: "lang",
      defaultLocale: "fr",
      locales: ["en", "fr", "de"],
      pseudoLocale: "pseudo",
    })
  })

  it("should normalize locale keys in localeMapping", () => {
    const plugin = linguiRouterPlugin({
      linguiConfig: mockLinguiConfig as any,
      localeMapping: { "EN-US": "EN", FR_FR: "FR" },
      locales: ["en"],
    })

    const config = {
      root: "/test",
    } as unknown as any

    plugin.configResolved(config)

    expect(config.linguiRouterConfig.localeMapping).toEqual({
      "en-us": "en",
      "fr-fr": "fr",
    })
  })

  it("should normalize defaultLocale and locales", () => {
    const plugin = linguiRouterPlugin({
      linguiConfig: mockLinguiConfig as any,
      defaultLocale: "EN_US",
      locales: ["EN-US", "FR_FR", "DE-DE"],
    })

    const config = {
      root: "/test",
    } as unknown as any

    plugin.configResolved(config)

    expect(config.linguiRouterConfig.defaultLocale).toBe("en-us")
    expect(config.linguiRouterConfig.locales).toEqual(["en-us", "fr-fr", "de-de"])
  })

  it("should normalize pseudoLocale when provided", () => {
    const plugin = linguiRouterPlugin({
      linguiConfig: mockLinguiConfig as any,
      pseudoLocale: "PSEUDO-LOCALE",
      locales: ["en"],
    })

    const config = {
      root: "/test",
    } as unknown as any

    plugin.configResolved(config)

    expect(config.linguiRouterConfig.pseudoLocale).toBe("pseudo-locale")
  })
})
