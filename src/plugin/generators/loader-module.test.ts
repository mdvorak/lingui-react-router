import { describe, expect, it, vi, beforeEach } from "vitest"
import type { LinguiConfigNormalized } from "@lingui/conf"
import type { LinguiRouterPluginConfigFull } from "../plugin-config"
import {
  generateLoaderModuleServer,
  generateLoaderModuleClient,
  buildConfig,
} from "./loader-module"

vi.mock("./cldr", () => ({
  getAllLocales: vi.fn(async () =>
    new Set([
      "en",
      "en-US",
      "en-GB",
      "fr",
      "fr-FR",
      "fr-CA",
      "es",
      "es-ES",
      "es-MX",
      "de",
      "de-DE",
      "it",
      "ja",
      "zh",
      "zh-Hans",
      "pt",
      "pt-BR",
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
      const result = await generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))

      expect(result).toContain('import { setupI18n } from "@lingui/core"')
      expect(result).toContain('import { messages as locale_en } from \'virtual:lingui-router-locale-en\'')
      expect(result).toContain('import { messages as locale_fr } from \'virtual:lingui-router-locale-fr\'')
      expect(result).toContain('import { messages as locale_es } from \'virtual:lingui-router-locale-es\'')
      expect(result).toContain('export const config =')
      expect(result).toContain('export const localeLoaders = {')
      expect(result).toContain('export function $getI18nInstance(locale)')
    })

    it("should include locale detection when detectLocale is true", async () => {
      mockPluginConfig.detectLocale = true

      const result = await generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))

      expect(result).toContain('import { negotiateClientLocale } from "lingui-react-router/negotiate"')
      expect(result).toContain('export const $detectLocale = negotiateClientLocale')
    })

    it("should exclude locale detection when detectLocale is false", async () => {
      mockPluginConfig.detectLocale = false

      const result = await generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))

      expect(result).not.toContain('negotiateClientLocale')
      expect(result).toContain('export const $detectLocale = () => undefined')
    })

    it("should handle locales with hyphens correctly", async () => {
      mockPluginConfig.locales = ["en-US", "fr-CA"]
      mockLinguiConfig.locales = ["en-US", "fr-CA"]

      const result = await generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))

      expect(result).toContain('locale_en_US')
      expect(result).toContain('locale_fr_CA')
      expect(result).toContain('virtual:lingui-router-locale-en-US')
      expect(result).toContain('virtual:lingui-router-locale-fr-CA')
    })

    it("should generate localeLoaders with Promise.resolve wrappers", async () => {
      const result = await generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))

      expect(result).toContain("'en': () => Promise.resolve({messages: locale_en})")
      expect(result).toContain("'fr': () => Promise.resolve({messages: locale_fr})")
      expect(result).toContain("'es': () => Promise.resolve({messages: locale_es})")
    })

    it("should generate i18nInstances map", async () => {
      const result = await generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))

      expect(result).toContain("const i18nInstances = {")
      expect(result).toContain("setupI18n({ locale: 'en', messages: localeMessages })")
    })

    it("should generate locale mapping with CLDR fallbacks", async () => {
      mockPluginConfig.locales = ["en", "fr"]
      mockPluginConfig.localeMapping = {}

      const result = await generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))

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
      mockPluginConfig.localeMapping = { "de": "en" }

      const result = await generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))

      const localeMapMatch = result.match(/export const localeMapping = JSON\.parse\(`([^`]+)`\)/)
      const localeMap = JSON.parse(localeMapMatch![1])

      expect(localeMap.de).toBe("en")
    })

    it("should throw error when mapped locale is already defined", async () => {
      mockPluginConfig.locales = ["en", "fr"]
      mockPluginConfig.localeMapping = { "en": "fr" }

      await expect(
        generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))
      ).rejects.toThrow("Mapped locale en is already defined")
    })

    it("should throw error when fallback locale is not defined", async () => {
      mockPluginConfig.locales = ["en"]
      mockPluginConfig.localeMapping = { "de": "fr" }

      await expect(
        generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))
      ).rejects.toThrow("Fallback locale fr for locale de is not defined")
    })

    it("should prioritize more specific locales in CLDR mapping", async () => {
      mockPluginConfig.locales = ["en", "en-gb"]
      mockPluginConfig.localeMapping = {}

      const result = await generateLoaderModuleServer(mockPluginConfig, buildConfig(mockPluginConfig, true))

      const localeMapMatch = result.match(/export const localeMapping = JSON\.parse\(`([^`]+)`\)/)
      const localeMap = JSON.parse(localeMapMatch![1])

      expect(localeMap["en-gb"]).toBe("en-gb")
      expect(localeMap["en-us"]).toBe("en")
    })
  })

  describe("generateLoaderModuleClient", () => {
    it("should generate client loader module with dynamic imports", async () => {
      const result = await generateLoaderModuleClient(mockPluginConfig, buildConfig(mockPluginConfig, false))

      expect(result).toContain('export const config =')
      expect(result).toContain('export const localeLoaders = {')
      expect(result).toContain("'en': () => import('virtual:lingui-router-locale-en')")
      expect(result).toContain("'fr': () => import('virtual:lingui-router-locale-fr')")
      expect(result).toContain("'es': () => import('virtual:lingui-router-locale-es')")
    })

    it("should not include locale detection imports", async () => {
      const result = await generateLoaderModuleClient(mockPluginConfig, buildConfig(mockPluginConfig, false))

      expect(result).not.toContain('negotiateClientLocale')
      expect(result).not.toContain('$detectLocale')
    })

    it("should use client i18n instance", async () => {
      const result = await generateLoaderModuleClient(mockPluginConfig, buildConfig(mockPluginConfig, false))

      expect(result).toContain('import { i18n } from "@lingui/core"')
      expect(result).toContain('export function $getI18nInstance(_locale)')
      expect(result).toContain('return i18n')
    })

    it("should set localeMapping to undefined", async () => {
      const result = await generateLoaderModuleClient(mockPluginConfig, buildConfig(mockPluginConfig, false))

      expect(result).toContain('export const localeMapping = undefined')
    })

    it("should handle locales with hyphens", async () => {
      mockPluginConfig.locales = ["en-US", "fr-CA"]

      const result = await generateLoaderModuleClient(mockPluginConfig, buildConfig(mockPluginConfig, false))

      expect(result).toContain("'en-US': () => import('virtual:lingui-router-locale-en-US')")
      expect(result).toContain("'fr-CA': () => import('virtual:lingui-router-locale-fr-CA')")
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

