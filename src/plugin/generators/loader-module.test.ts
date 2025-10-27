import type { LinguiConfigNormalized } from "@lingui/conf"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { LinguiRouterPluginConfigFull } from "../plugin-config"
import {
  buildConfig,
  buildLocaleMapping,
  generateLoaderModuleClient,
  generateLoaderModuleServer,
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
      ])
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
      localeParamName: "locale",
      linguiConfig: mockLinguiConfig,
    }
  })

  describe("generateLoaderModuleServer", () => {
    it("should generate server loader module with static imports", async () => {
      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true)
      )

      expect(result).toContain('import { setupI18n } from "@lingui/core"')
      expect(result).toContain(
        "import { messages as locale_en } from 'virtual:lingui-router-locale-en'"
      )
      expect(result).toContain(
        "import { messages as locale_fr } from 'virtual:lingui-router-locale-fr'"
      )
      expect(result).toContain(
        "import { messages as locale_es } from 'virtual:lingui-router-locale-es'"
      )
      expect(result).toContain("export const config =")
      expect(result).toContain("export const localeLoaders = {")
      expect(result).toContain("export function $getI18nInstance(locale)")
    })

    it("should include locale detection when detectLocale is true", async () => {
      mockPluginConfig.detectLocale = true

      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true)
      )

      expect(result).toContain(
        'import { negotiateClientLocale } from "lingui-react-router/negotiate"'
      )
      expect(result).toContain("export const $detectLocale = negotiateClientLocale")
    })

    it("should exclude locale detection when detectLocale is false", async () => {
      mockPluginConfig.detectLocale = false

      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true)
      )

      expect(result).not.toContain("negotiateClientLocale")
      expect(result).toContain("export const $detectLocale = () => undefined")
    })

    it("should handle locales with hyphens correctly", async () => {
      mockPluginConfig.locales = ["en-US", "fr-CA"]
      mockLinguiConfig.locales = ["en-US", "fr-CA"]

      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true)
      )

      expect(result).toContain("locale_en_US")
      expect(result).toContain("locale_fr_CA")
      expect(result).toContain("virtual:lingui-router-locale-en-US")
      expect(result).toContain("virtual:lingui-router-locale-fr-CA")
    })

    it("should generate localeLoaders with Promise.resolve wrappers", async () => {
      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true)
      )

      expect(result).toContain("'en': () => Promise.resolve({messages: locale_en})")
      expect(result).toContain("'fr': () => Promise.resolve({messages: locale_fr})")
      expect(result).toContain("'es': () => Promise.resolve({messages: locale_es})")
    })

    it("should generate i18nInstances map", async () => {
      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true)
      )

      expect(result).toContain("const i18nInstances = {")
      expect(result).toContain("setupI18n({ locale: 'en', messages: localeMessages })")
    })

    it("should generate locale mapping with CLDR fallbacks", async () => {
      mockPluginConfig.locales = ["en", "fr"]
      mockPluginConfig.localeMapping = {}

      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true)
      )

      expect(result).toContain("export const localeMapping = JSON.parse")
      const localeMapMatch = result.match(/export const localeMapping = JSON\.parse\(`([^`]+)`\)/)
      expect(localeMapMatch).toBeTruthy()

      const localeMap = JSON.parse(localeMapMatch![1])
      expect(localeMap.en).toBe("en")
      expect(localeMap.fr).toBe("fr")
      expect(localeMap["en-us"]).toBe("en")
      expect(localeMap["fr-ca"]).toBe("fr")
    })

    it("should respect custom locale mappings", async () => {
      mockPluginConfig.locales = ["en", "fr"]
      mockPluginConfig.localeMapping = { de: "en" }

      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true)
      )

      const localeMapMatch = result.match(/export const localeMapping = JSON\.parse\(`([^`]+)`\)/)
      const localeMap = JSON.parse(localeMapMatch![1])
      // Custom mapping should be present

      // CLDR fallbacks should still be present
      expect(localeMap.en).toBe("en")
      expect(localeMap.fr).toBe("fr")
      expect(localeMap["en-us"]).toBe("en")
      expect(localeMap["fr-ca"]).toBe("fr")
      expect(localeMap.de).toBe("en")
    })

    it("should throw error when mapped locale is already defined", async () => {
      mockPluginConfig.locales = ["en", "fr"]
      mockPluginConfig.localeMapping = { en: "fr" }

      await expect(
        generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))
      ).rejects.toThrow("Mapped locale en is already defined")
    })

    it("should throw error when fallback locale is not defined", async () => {
      mockPluginConfig.locales = ["en"]
      mockPluginConfig.localeMapping = { de: "fr" }

      await expect(
        generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))
      ).rejects.toThrow("Fallback locale fr for locale de is not defined")
    })

    it("should prioritize more specific locales in CLDR mapping", async () => {
      mockPluginConfig.locales = ["en", "en-gb"]
      mockPluginConfig.localeMapping = {}

      const result = await generateLoaderModuleServer(
        mockPluginConfig,
        buildConfig(mockPluginConfig, true)
      )

      const localeMapMatch = result.match(/export const localeMapping = JSON\.parse\(`([^`]+)`\)/)
      const localeMap = JSON.parse(localeMapMatch![1])

      expect(localeMap["en-gb"]).toBe("en-gb")
      expect(localeMap["en-us"]).toBe("en")
    })
  })

  describe("generateLoaderModuleClient", () => {
    it("should generate client loader module with dynamic imports", async () => {
      const result = await generateLoaderModuleClient(
        mockPluginConfig,
        buildConfig(mockPluginConfig, false)
      )

      expect(result).toContain("export const config =")
      expect(result).toContain("export const localeLoaders = {")
      expect(result).toContain("'en': () => import('virtual:lingui-router-locale-en')")
      expect(result).toContain("'fr': () => import('virtual:lingui-router-locale-fr')")
      expect(result).toContain("'es': () => import('virtual:lingui-router-locale-es')")
    })

    it("should not include locale detection imports", async () => {
      const result = await generateLoaderModuleClient(
        mockPluginConfig,
        buildConfig(mockPluginConfig, false)
      )

      expect(result).not.toContain("negotiateClientLocale")
      expect(result).not.toContain("$detectLocale")
    })

    it("should use client i18n instance", async () => {
      const result = await generateLoaderModuleClient(
        mockPluginConfig,
        buildConfig(mockPluginConfig, false)
      )

      expect(result).toContain('import { i18n } from "@lingui/core"')
      expect(result).toContain("export function $getI18nInstance(_locale)")
      expect(result).toContain("return i18n")
    })

    it("should set localeMapping to undefined", async () => {
      const result = await generateLoaderModuleClient(
        mockPluginConfig,
        buildConfig(mockPluginConfig, false)
      )

      expect(result).toContain("export const localeMapping = undefined")
    })

    it("should handle locales with hyphens", async () => {
      mockPluginConfig.locales = ["en-US", "fr-CA"]

      const result = await generateLoaderModuleClient(
        mockPluginConfig,
        buildConfig(mockPluginConfig, false)
      )

      expect(result).toContain("'en-US': () => import('virtual:lingui-router-locale-en-US')")
      expect(result).toContain("'fr-CA': () => import('virtual:lingui-router-locale-fr-CA')")
    })
  })

  describe("buildLocaleMapping", () => {
    it("should include identity mappings for all defined locales", async () => {
      const result = await buildLocaleMapping(["en", "fr", "es"], {})

      expect(result.en).toBe("en")
      expect(result.fr).toBe("fr")
      expect(result.es).toBe("es")
    })

    it("should add CLDR fallback mappings for more specific locales", async () => {
      const result = await buildLocaleMapping(["en", "fr"], {})

      expect(result["en-us"]).toBe("en")
      expect(result["en-gb"]).toBe("en")
      expect(result["fr-fr"]).toBe("fr")
      expect(result["fr-ca"]).toBe("fr")
    })

    it("should add custom locale mappings", async () => {
      const result = await buildLocaleMapping(["en", "fr"], { de: "en", it: "fr" })

      expect(result.de).toBe("en")
      expect(result.it).toBe("fr")
    })

    it("should combine custom mappings with CLDR fallbacks", async () => {
      const result = await buildLocaleMapping(["en", "fr"], { de: "en" })

      expect(result.de).toBe("en")
      expect(result.en).toBe("en")
      expect(result.fr).toBe("fr")
      expect(result["en-us"]).toBe("en")
      expect(result["fr-ca"]).toBe("fr")
    })

    it("should prioritize more specific defined locales over general ones", async () => {
      const result = await buildLocaleMapping(["en", "en-gb"], {})

      expect(result["en-gb"]).toBe("en-gb")
      expect(result["en-us"]).toBe("en")
    })

    it("should handle locales with multiple hyphens correctly", async () => {
      const result = await buildLocaleMapping(["zh", "zh-hans"], {})

      expect(result.zh).toBe("zh")
      expect(result["zh-hans"]).toBe("zh-hans")
    })

    it("should throw error when mapped locale is already defined", async () => {
      await expect(buildLocaleMapping(["en", "fr"], { en: "fr" })).rejects.toThrow(
        "Mapped locale en is already defined"
      )
    })

    it("should throw error when fallback locale is not defined", async () => {
      await expect(buildLocaleMapping(["en"], { de: "fr" })).rejects.toThrow(
        "Fallback locale fr for locale de is not defined"
      )
    })

    it("should normalize locale keys correctly", async () => {
      const result = await buildLocaleMapping(["en-us"], {})

      expect(result["en-us"]).toBe("en-us")
    })

    it("should handle empty locale list", async () => {
      const result = await buildLocaleMapping([], {})

      expect(Object.keys(result)).toHaveLength(0)
    })

    it("should handle empty custom mappings", async () => {
      const result = await buildLocaleMapping(["en"], {})

      expect(result.en).toBe("en")
      expect(result["en-us"]).toBe("en")
      expect(result["en-gb"]).toBe("en")
    })

    it("should not add CLDR fallback if exact locale is already defined", async () => {
      const result = await buildLocaleMapping(["en-us", "en-gb"], {})

      expect(result["en-us"]).toBe("en-us")
      expect(result["en-gb"]).toBe("en-gb")
    })

    it("should handle complex scenario with multiple locale levels", async () => {
      const result = await buildLocaleMapping(["en", "en-gb", "fr"], { de: "en", "de-ch": "en-gb" })

      expect(result.de).toBe("en")
      expect(result["de-ch"]).toBe("en-gb")
      expect(result.en).toBe("en")
      expect(result["en-gb"]).toBe("en-gb")
      expect(result.fr).toBe("fr")
      expect(result["en-us"]).toBe("en")
      expect(result["fr-ca"]).toBe("fr")
    })

    it("should validate custom mappings before processing CLDR fallbacks", async () => {
      await expect(buildLocaleMapping(["en"], { fr: "de" })).rejects.toThrow(
        "Fallback locale de for locale fr is not defined"
      )
    })

    it("should handle locales with region and script subtags", async () => {
      const result = await buildLocaleMapping(["zh", "zh-hans"], {})

      expect(result.zh).toBe("zh")
      expect(result["zh-hans"]).toBe("zh-hans")
      expect(result["zh-hans-cn"]).toBe("zh-hans")
      expect(result["zh-hans-sg"]).toBe("zh-hans")
    })

    it("should fallback to more general locale when specific locale not defined", async () => {
      const result = await buildLocaleMapping(["zh"], {})
      expect(result.zh).toBe("zh")
      expect(result["zh-hans"]).toBe("zh")
      expect(result["zh-hans-cn"]).toBe("zh")
      expect(result["zh-hans-sg"]).toBe("zh")
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
})
