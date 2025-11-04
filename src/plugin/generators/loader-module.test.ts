import type { LinguiConfigNormalized } from "@lingui/conf"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { LinguiRouterPluginConfigFull } from "../plugin-config"
import {
  buildConfig,
  buildLocaleMapping,
  generateDetectLocale,
  generateLoaderModuleClient,
  generateLoaderModuleServer,
  generateLocaleMapping,
  generateEmptyLocaleMapping,
} from "./loader-module"

vi.mock("./cldr", () => ({
  getAllLocales: vi.fn(
    async () =>
      new Set([
        "de",
        "de-DE",
        "en",
        "en-GB",
        "en-US",
        "es",
        "es-ES",
        "es-MX",
        "fr",
        "fr-CA",
        "fr-FR",
        "it",
        "ja",
        "pt",
        "pt-BR",
        "zh",
        "zh-Hans",
        "zh-Hans-CN",
        "zh-Hans-SG",
      ]),
  ),
}))

describe("loader-module", () => {
  let mockPluginConfig: LinguiRouterPluginConfigFull
  let mockLinguiConfig: LinguiConfigNormalized

  beforeEach(() => {
    mockLinguiConfig = {
      locales: ["en", "fr", "es"],
      catalogs: [
        {
          path: "<rootDir>/locales/{locale}",
          include: ["<rootDir>/src"],
        },
      ],
      rootDir: "/project",
    } as LinguiConfigNormalized

    mockPluginConfig = {
      locales: ["en", "fr", "es"],
      defaultLocale: "en",
      pseudoLocale: undefined,
      exclude: ["api"],
      redirect: "auto",
      detectLocale: true,
      localeMapping: {},
      defaultLocaleMapping: true,
      localeParamName: "locale",
      linguiConfig: mockLinguiConfig,
    }
  })

  describe("generateLoaderModuleServer", () => {
    it("should generate server loader module with static imports", async () => {
      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true),
      )

      expect(result).toContain("import { setupI18n } from \"@lingui/core\"")
      expect(result).toContain(
        "import { messages as locale_en } from 'virtual:lingui-router-locale-en'",
      )
      expect(result).toContain(
        "import { messages as locale_fr } from 'virtual:lingui-router-locale-fr'",
      )
      expect(result).toContain(
        "import { messages as locale_es } from 'virtual:lingui-router-locale-es'",
      )

      expect(result.some(s => s.includes("export const config ="))).toBeTruthy()
      expect(result.some(s => s.includes("export const localeLoaders = {"))).toBeTruthy()
      expect(result.some(s => s.includes("export function $getI18nInstance(locale)"))).toBeTruthy()
    })

    it("should handle locales with hyphens correctly", async () => {
      mockPluginConfig.locales = ["en-US", "fr-CA"]
      mockLinguiConfig.locales = ["en-US", "fr-CA"]

      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true),
      )

      expect(result.some(s => s.includes("locale_en_US"))).toBeTruthy()
      expect(result.some(s => s.includes("locale_fr_CA"))).toBeTruthy()
      expect(result.some(s => s.includes("virtual:lingui-router-locale-en-US"))).toBeTruthy()
      expect(result.some(s => s.includes("virtual:lingui-router-locale-fr-CA"))).toBeTruthy()
    })

    it("should generate localeLoaders with Promise.resolve wrappers", async () => {
      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true),
      )

      expect(result.some(s => s.includes("'en': () => Promise.resolve({messages: locale_en})"))).toBeTruthy()
      expect(result.some(s => s.includes("'fr': () => Promise.resolve({messages: locale_fr})"))).toBeTruthy()
      expect(result.some(s => s.includes("'es': () => Promise.resolve({messages: locale_es})"))).toBeTruthy()
    })

    it("should generate i18nInstances map", async () => {
      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true),
      )

      expect(result.some(s => s.includes("const i18nInstances = {"))).toBeTruthy()
      expect(result.some(s => s.includes("setupI18n({ locale: 'en', messages: localeMessages })"))).toBeTruthy()
    })
  })

  describe("generateLoaderModuleClient", () => {
    it("should generate client loader module with dynamic imports", async () => {
      const result = await generateLoaderModuleClient(
        mockPluginConfig,
        buildConfig(mockPluginConfig, false),
      )

      expect(result.some(s => s.includes("export const config ="))).toBeTruthy()
      expect(result.some(s => s.includes("export const localeLoaders = {"))).toBeTruthy()
      expect(result.some(s => s.includes("  'en': () => import('virtual:lingui-router-locale-en')"))).toBeTruthy()
      expect(result.some(s => s.includes("  'fr': () => import('virtual:lingui-router-locale-fr')"))).toBeTruthy()
      expect(result.some(s => s.includes("  'es': () => import('virtual:lingui-router-locale-es')"))).toBeTruthy()
    })

    it("should use client i18n instance", async () => {
      const result = await generateLoaderModuleClient(
        mockPluginConfig,
        buildConfig(mockPluginConfig, false),
      )

      expect(result.some(s => s.includes(`import { i18n as i18n } from "@lingui/core"`))).toBeTruthy()
      expect(result.some(s => s.includes(`export function $getI18nInstance(_locale) {
  return i18n
}`))).toBeTruthy()
    })

    it("should use custom runtimeConfigModule import when provided", async () => {
      // Set runtimeConfigModule to a custom module and import name
      mockLinguiConfig.runtimeConfigModule = { i18n: ["my-i18n-module", "myI18n"] } as any
      mockPluginConfig.linguiConfig = mockLinguiConfig

      const result = await generateLoaderModuleClient(
        mockPluginConfig,
        buildConfig(mockPluginConfig, false),
      )

      // Expect import to use provided module and import name
      expect(result.some(s => s.includes(`import { myI18n as i18n } from \"my-i18n-module\"`))).toBeTruthy()
      expect(result.some(s => s.includes(`export function $getI18nInstance(_locale) {`))).toBeTruthy()
      expect(result.some(s => s.includes(`return i18n`))).toBeTruthy()
    })

    it("should use custom runtimeConfigModule import without specifier when provided", async () => {
      // Set runtimeConfigModule to a custom module without import name
      mockLinguiConfig.runtimeConfigModule = { i18n: ["my-i18n-module"] } as any
      mockPluginConfig.linguiConfig = mockLinguiConfig

      const result = await generateLoaderModuleClient(
        mockPluginConfig,
        buildConfig(mockPluginConfig, false),
      )

      // Expect import to use provided module with default import name
      expect(result.some(s => s.includes(`import { i18n as i18n } from \"my-i18n-module\"`))).toBeTruthy()
      expect(result.some(s => s.includes(`export function $getI18nInstance(_locale) {`))).toBeTruthy()
      expect(result.some(s => s.includes(`return i18n`))).toBeTruthy()
    })

    it("should set localeMapping to undefined", async () => {
      const result = await generateLoaderModuleClient(
        mockPluginConfig,
        buildConfig(mockPluginConfig, false),
      )

      expect(result).not.toContain(/export const localeMapping/)
    })

    it("should handle locales with hyphens", async () => {
      mockPluginConfig.locales = ["en-US", "fr-CA"]

      const result = await generateLoaderModuleClient(
        mockPluginConfig,
        buildConfig(mockPluginConfig, false),
      )

      expect(result.some(s => s.includes("  'en-US': () => import('virtual:lingui-router-locale-en-US')"))).toBeTruthy()
      expect(result.some(s => s.includes("  'fr-CA': () => import('virtual:lingui-router-locale-fr-CA')"))).toBeTruthy()
    })
  })

  describe("buildLocaleMapping", () => {
    it("should include identity mappings for all defined locales", async () => {
      const result = await buildLocaleMapping(["en", "fr", "es"], {}, true)

      expect(result.en).toBe("en")
      expect(result.fr).toBe("fr")
      expect(result.es).toBe("es")
    })

    it("should add CLDR fallback mappings for more specific locales", async () => {
      const result = await buildLocaleMapping(["en", "fr"], {}, true)

      expect(result["en-us"]).toBe("en")
      expect(result["en-gb"]).toBe("en")
      expect(result["fr-fr"]).toBe("fr")
      expect(result["fr-ca"]).toBe("fr")
    })

    it("should add custom locale mappings", async () => {
      const result = await buildLocaleMapping(["en", "fr"], { de: "en", it: "fr" }, true)

      expect(result.de).toBe("en")
      expect(result.it).toBe("fr")
    })

    it("should combine custom mappings with CLDR fallbacks", async () => {
      const result = await buildLocaleMapping(["en", "fr"], { de: "en" }, true)

      expect(result.de).toBe("en")
      expect(result.en).toBe("en")
      expect(result.fr).toBe("fr")
      expect(result["en-us"]).toBe("en")
      expect(result["fr-ca"]).toBe("fr")
    })

    it("should prioritize more specific defined locales over general ones", async () => {
      const result = await buildLocaleMapping(["en", "en-gb"], {}, true)

      expect(result["en-gb"]).toBe("en-gb")
      expect(result["en-us"]).toBe("en")
    })

    it("should handle locales with multiple hyphens correctly", async () => {
      const result = await buildLocaleMapping(["zh", "zh-hans"], {}, true)

      expect(result.zh).toBe("zh")
      expect(result["zh-hans"]).toBe("zh-hans")
    })

    it("should throw error when mapped locale is already defined", async () => {
      await expect(buildLocaleMapping(["en", "fr"], { en: "fr" }, true)).rejects.toThrow(
        "Mapped locale 'en' is already defined",
      )
    })

    it("should throw error when fallback locale is not defined", async () => {
      await expect(buildLocaleMapping(["en"], { de: "fr" }, true)).rejects.toThrow(
        "Fallback locale 'fr' for locale 'de' is not defined",
      )
    })

    it("should normalize locale keys correctly", async () => {
      const result = await buildLocaleMapping(["en-us"], {}, true)

      expect(result["en-us"]).toBe("en-us")
    })

    it("should handle empty locale list", async () => {
      const result = await buildLocaleMapping([], {}, true)

      expect(Object.keys(result)).toHaveLength(0)
    })

    it("should handle empty custom mappings", async () => {
      const result = await buildLocaleMapping(["en"], {}, true)

      expect(result.en).toBe("en")
      expect(result["en-us"]).toBe("en")
      expect(result["en-gb"]).toBe("en")
    })

    it("should not add CLDR fallback if exact locale is already defined", async () => {
      const result = await buildLocaleMapping(["en-us", "en-gb"], {}, true)

      expect(result["en-us"]).toBe("en-us")
      expect(result["en-gb"]).toBe("en-gb")
    })

    it("should handle complex scenario with multiple locale levels", async () => {
      const result = await buildLocaleMapping(["en", "en-gb", "fr"], {
        de: "en",
        "de-ch": "en-gb",
      }, true)

      expect(result.de).toBe("en")
      expect(result["de-ch"]).toBe("en-gb")
      expect(result.en).toBe("en")
      expect(result["en-gb"]).toBe("en-gb")
      expect(result.fr).toBe("fr")
      expect(result["en-us"]).toBe("en")
      expect(result["fr-ca"]).toBe("fr")
    })

    it("should validate custom mappings before processing CLDR fallbacks", async () => {
      await expect(buildLocaleMapping(["en"], { fr: "de" }, true)).rejects.toThrow(
        "Fallback locale 'de' for locale 'fr' is not defined",
      )
    })

    it("should handle locales with region and script subtags", async () => {
      const result = await buildLocaleMapping(["zh", "zh-hans"], {}, true)

      expect(result.zh).toBe("zh")
      expect(result["zh-hans"]).toBe("zh-hans")
      expect(result["zh-hans-cn"]).toBe("zh-hans")
      expect(result["zh-hans-sg"]).toBe("zh-hans")
    })

    it("should fallback to more general locale when specific locale not defined", async () => {
      const result = await buildLocaleMapping(["zh"], {}, true)
      expect(result.zh).toBe("zh")
      expect(result["zh-hans"]).toBe("zh")
      expect(result["zh-hans-cn"]).toBe("zh")
      expect(result["zh-hans-sg"]).toBe("zh")
    })

    it("should only include identity and custom mappings when defaultLocaleMapping is false", async () => {
      const result = await buildLocaleMapping(["en", "fr", "es"], { de: "en" }, false)

      // Identity mappings
      expect(result.en).toBe("en")
      expect(result.fr).toBe("fr")
      expect(result.es).toBe("es")

      // Custom mapping should be present
      expect(result.de).toBe("en")

      // No CLDR fallbacks should be added
      expect(result).not.toHaveProperty("en-gb")
      expect(result).not.toHaveProperty("fr-ca")
    })
  })

  describe("buildConfig", () => {
    it("should build server config correctly", () => {
      const config = buildConfig(mockPluginConfig, true)

      expect(config).toEqual({
        locales: ["en", "fr", "es"],
        pseudoLocale: undefined,
        defaultLocale: "en",
        exclude: ["api"],
        redirect: "auto",
        runtimeEnv: "server",
        localeParamName: "locale",
      })
    })

    it("should build client config correctly", () => {
      const config = buildConfig(mockPluginConfig, false)

      expect(config).toEqual({
        locales: ["en", "fr", "es"],
        pseudoLocale: undefined,
        defaultLocale: "en",
        exclude: ["api"],
        redirect: "auto",
        runtimeEnv: "client",
        localeParamName: "locale",
      })
    })

    it("should include pseudoLocale when defined", () => {
      mockPluginConfig.pseudoLocale = "pseudo"

      const config = buildConfig(mockPluginConfig, true)

      expect(config.pseudoLocale).toBe("pseudo")
    })

    it("should handle different redirect behaviors", () => {
      mockPluginConfig.redirect = "always"
      const configAlways = buildConfig(mockPluginConfig, true)
      expect(configAlways.redirect).toBe("always")

      mockPluginConfig.redirect = "never"
      const configNever = buildConfig(mockPluginConfig, true)
      expect(configNever.redirect).toBe("never")

      mockPluginConfig.redirect = "auto"
      const configAuto = buildConfig(mockPluginConfig, true)
      expect(configAuto.redirect).toBe("auto")
    })

    it("should handle custom localeParamName", () => {
      mockPluginConfig.localeParamName = "lang"

      const config = buildConfig(mockPluginConfig, true)

      expect(config.localeParamName).toBe("lang")
    })

    it("should handle multiple excluded paths", () => {
      mockPluginConfig.exclude = ["api", "admin", "static"]

      const config = buildConfig(mockPluginConfig, true)

      expect(config.exclude).toEqual(["api", "admin", "static"])
    })
  })

  describe("generateLocaleMapping", () => {
    it("should generate locale mapping when no mappings defined", async () => {
      mockPluginConfig.localeMapping = {}

      const result = await generateLocaleMapping(mockPluginConfig)

      expect(result).toHaveLength(1)

      const localeMapMatch = result[0].match(/export const localeMapping = JSON\.parse\(`([^`]+)`\)/)
      const localeMap = JSON.parse(localeMapMatch![1])

      expect(localeMap).toMatchObject({
        "fr-ca": "fr",
        "en-gb": "en",
      })
    })

    it("should generate correct locale mapping code", async () => {
      mockPluginConfig.localeMapping = {
        de: "fr",
        "en-gb": "en",
      }

      const result = await generateLocaleMapping(mockPluginConfig)

      expect(result).toHaveLength(1)

      const localeMapMatch = result[0].match(/export const localeMapping = JSON\.parse\(`([^`]+)`\)/)
      const localeMap = JSON.parse(localeMapMatch![1])

      expect(localeMap).toMatchObject({
        ...mockPluginConfig.localeMapping,
        "fr-ca": "fr",
      })
    })

    it("should include CLDR fallbacks when defaultLocaleMapping is true", async () => {
      mockPluginConfig.localeMapping = {}
      mockPluginConfig.defaultLocaleMapping = true

      const result = await generateLocaleMapping(mockPluginConfig)

      expect(result).toHaveLength(1)

      const localeMapMatch = result[0].match(/export const localeMapping = JSON\.parse\(`([^`]+)`\)/)
      const localeMap = JSON.parse(localeMapMatch![1])

      // CLDR fallbacks should be present
      expect(localeMap).toHaveProperty("fr-ca")
      expect(localeMap).toHaveProperty("en-gb")
      // Identity mappings should also exist
      expect(localeMap).toHaveProperty("en")
      expect(localeMap).toHaveProperty("fr")
    })

    it("should NOT include CLDR fallbacks when defaultLocaleMapping is false", async () => {
      mockPluginConfig.localeMapping = {}
      mockPluginConfig.defaultLocaleMapping = false

      const result = await generateLocaleMapping(mockPluginConfig)

      expect(result).toHaveLength(1)

      const localeMapMatch = result[0].match(/export const localeMapping = JSON\.parse\(`([^`]+)`\)/)
      const localeMap = JSON.parse(localeMapMatch![1])

      // Only identity mappings should be present (en, fr, es)
      expect(Object.keys(localeMap).sort()).toEqual(["en", "es", "fr"].sort())
      expect(localeMap).not.toHaveProperty("fr-ca")
      expect(localeMap).not.toHaveProperty("en-gb")
    })
  })

  describe("generateEmptyLocaleMapping", () => {
    it("should generate an empty locale mapping module", () => {
      const result = generateEmptyLocaleMapping()

      expect(result).toHaveLength(1)
      expect(result[0]).toBe("export const localeMapping = undefined")
    })
  })

  describe("generateDetectLocale", () => {
    it("should generate detection import and export when enabled", () => {
      const result = generateDetectLocale(true)

      expect(result).toHaveLength(2)
      expect(result[0]).toBe("import { negotiateClientLocale } from \"lingui-react-router/negotiate\"")
      expect(result[1]).toBe("export const $detectLocale = negotiateClientLocale")
    })

    it("should return noop detect function when disabled", () => {
      const result = generateDetectLocale(false)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe("export const $detectLocale = () => undefined")
    })
  })
})
