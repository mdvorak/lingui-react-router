import path from "node:path"
import type { LinguiConfigNormalized } from "@lingui/conf"
import fg from "fast-glob"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { LinguiRouterPluginConfigFull } from "../plugin-config"
import { generateLocaleModule } from "./locale-module"

vi.mock("fast-glob")

function normalizePath(p: string) {
  p = path.resolve(p)
  return path.sep !== "/" ? p.replaceAll(path.sep, "/") : p
}

describe("locale-module", () => {
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
      optimizeLocaleBundles: false,
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("generateLocaleModule", () => {
    it("should generate module with single catalog", async () => {
      vi.mocked(fg).mockResolvedValue(["locales/en.po"])

      const result = await generateLocaleModule("en", mockPluginConfig)

      expect(result).toContain(`export * from '${normalizePath("/project/locales/en.po")}'`)
      expect(fg).toHaveBeenCalledWith(
        "/project/locales/en.po",
        expect.objectContaining({ cwd: "/project" }),
      )
    })

    it("should generate module with multiple catalogs", async () => {
      mockLinguiConfig.catalogs = [
        {
          path: "<rootDir>/locales/{locale}",
          include: ["<rootDir>/src"],
        },
        {
          path: "<rootDir>/components/{name}/{locale}",
          include: ["<rootDir>/components"],
        },
      ]

      vi.mocked(fg).mockResolvedValueOnce(["locales/en.po"])
      vi.mocked(fg).mockResolvedValueOnce(["components/Button/en.po", "components/Modal/en.po"])

      const result = await generateLocaleModule("en", mockPluginConfig)

      expect(result)
        .toEqual(`import {messages as catalog0} from '${normalizePath("/project/locales/en.po")}'
import {messages as catalog1} from '${normalizePath("/project/components/Button/en.po")}'
import {messages as catalog2} from '${normalizePath("/project/components/Modal/en.po")}'
export const messages = Object.assign({}, catalog0, catalog1, catalog2)`)
    })

    it("should handle locale with hyphen", async () => {
      mockLinguiConfig.locales = ["en-US", "en-GB"]
      mockPluginConfig.locales = ["en-us", "en-gb"]
      vi.mocked(fg).mockResolvedValue(["locales/en-US.po"])

      const result = await generateLocaleModule("en-us", mockPluginConfig)

      expect(result).toContain(`export * from '${normalizePath("/project/locales/en-US.po")}'`)
      expect(fg).toHaveBeenCalledWith("/project/locales/en-US.po", expect.any(Object))
    })

    it("should handle locale with underscore in lingui config", async () => {
      mockLinguiConfig.locales = ["en_US"]
      mockPluginConfig.locales = ["en-us"]
      vi.mocked(fg).mockResolvedValue(["locales/en_US.po"])

      const result = await generateLocaleModule("en-us", mockPluginConfig)

      expect(result).toBeTruthy()
      expect(fg).toHaveBeenCalledWith("/project/locales/en_US.po", expect.any(Object))
    })

    it("should throw error when locale not found in lingui config", async () => {
      await expect(generateLocaleModule("de", mockPluginConfig)).rejects.toThrow(
        "Locale 'de' not found in Lingui configuration locales",
      )
    })

    it("should replace {name} with wildcard in catalog path", async () => {
      mockLinguiConfig.catalogs = [
        {
          path: "<rootDir>/components/{name}/{locale}",
          include: ["<rootDir>/components"],
        },
      ]

      vi.mocked(fg).mockResolvedValue(["components/Button/en.po", "components/Input/en.po"])

      await generateLocaleModule("en", mockPluginConfig)

      expect(fg).toHaveBeenCalledWith("/project/components/*/en.po", expect.any(Object))
    })

    it("should replace <rootDir> placeholder in paths", async () => {
      mockLinguiConfig.catalogs = [
        {
          path: "<rootDir>/custom/path/{locale}",
          include: ["<rootDir>/src"],
        },
      ]
      mockLinguiConfig.rootDir = "/custom/root"

      vi.mocked(fg).mockResolvedValue(["custom/path/en.po"])

      await generateLocaleModule("en", mockPluginConfig)

      expect(fg).toHaveBeenCalledWith(
        "/custom/root/custom/path/en.po",
        expect.objectContaining({ cwd: "/custom/root" }),
      )
    })

    it("should handle empty catalog results", async () => {
      vi.mocked(fg).mockResolvedValue([])

      const result = await generateLocaleModule("en", mockPluginConfig)

      expect(result).toBe("")
    })

    it("should generate unique variable names for multiple catalogs", async () => {
      mockLinguiConfig.catalogs = [
        {
          path: "<rootDir>/locales/{locale}",
          include: ["<rootDir>/src"],
        },
      ]

      vi.mocked(fg).mockResolvedValue([
        "locales/messages/en.po",
        "locales/ui/en.po",
        "locales/errors/en.po",
      ])

      const result = await generateLocaleModule("en", mockPluginConfig)

      expect(result).toContain("catalog0")
      expect(result).toContain("catalog1")
      expect(result).toContain("catalog2")
      expect(result).not.toContain("catalog3")
    })

    it("should use absolute paths for imports", async () => {
      mockLinguiConfig.rootDir = "/absolute/project/path"
      vi.mocked(fg).mockResolvedValue(["locales/en.po"])

      const result = await generateLocaleModule("en", mockPluginConfig)

      expect(result).toContain(normalizePath("/absolute/project/path/locales/en.po"))
    })

    it("should handle multiple catalog configs with wildcards", async () => {
      mockLinguiConfig.catalogs = [
        {
          path: "<rootDir>/app/{name}/{locale}",
          include: ["<rootDir>/app"],
        },
        {
          path: "<rootDir>/lib/{name}/{locale}",
          include: ["<rootDir>/lib"],
        },
      ]

      vi.mocked(fg)
        .mockResolvedValueOnce(["app/auth/en.po", "app/profile/en.po"])
        .mockResolvedValueOnce(["lib/utils/en.po"])

      const result = await generateLocaleModule("en", mockPluginConfig)

      expect(result).toContain("catalog0")
      expect(result).toContain("catalog1")
      expect(result).toContain("catalog2")
      expect(result).toContain("Object.assign({}, catalog0, catalog1, catalog2)")
    })

    it("should handle catalogs with different directory structures", async () => {
      mockLinguiConfig.catalogs = [
        {
          path: "<rootDir>/i18n/{locale}/messages",
          include: ["<rootDir>/src"],
        },
      ]

      vi.mocked(fg).mockResolvedValue(["i18n/en/messages.po"])

      const result = await generateLocaleModule("en", mockPluginConfig)

      expect(result).toContain(normalizePath("/project/i18n/en/messages.po"))
    })

    it("should process catalogs in order", async () => {
      mockLinguiConfig.catalogs = [
        {
          path: "<rootDir>/base/{locale}",
          include: ["<rootDir>/src"],
        },
        {
          path: "<rootDir>/override/{locale}",
          include: ["<rootDir>/override"],
        },
      ]

      vi.mocked(fg).mockResolvedValueOnce(["base/en.po"]).mockResolvedValueOnce(["override/en.po"])

      const result = await generateLocaleModule("en", mockPluginConfig)

      const catalog0Index = result.indexOf("catalog0")
      const catalog1Index = result.indexOf("catalog1")
      expect(catalog0Index).toBeLessThan(catalog1Index)
      expect(result).toContain("Object.assign({}, catalog0, catalog1)")
    })

    it("should use custom catalog extension from format config", async () => {
      mockLinguiConfig.format = {
        catalogExtension: "json",
      } as any

      vi.mocked(fg).mockResolvedValue(["locales/en.json"])

      const result = await generateLocaleModule("en", mockPluginConfig)

      expect(result).toContain(`export * from '${normalizePath("/project/locales/en.json")}'`)
      expect(fg).toHaveBeenCalledWith(
        "/project/locales/en.json",
        expect.objectContaining({ cwd: "/project" }),
      )
    })

    it("should default to .po extension when format is a string", async () => {
      mockLinguiConfig.format = "po" as any

      vi.mocked(fg).mockResolvedValue(["locales/en.po"])

      const result = await generateLocaleModule("en", mockPluginConfig)

      expect(result).toContain(`export * from '${normalizePath("/project/locales/en.po")}'`)
      expect(fg).toHaveBeenCalledWith(
        "/project/locales/en.po",
        expect.objectContaining({ cwd: "/project" }),
      )
    })

    it("should default to .po extension when catalogExtension is not specified", async () => {
      mockLinguiConfig.format = {
        // catalogExtension not specified
      } as any

      vi.mocked(fg).mockResolvedValue(["locales/en.po"])

      const result = await generateLocaleModule("en", mockPluginConfig)

      expect(result).toContain(`export * from '${normalizePath("/project/locales/en.po")}'`)
      expect(fg).toHaveBeenCalledWith(
        "/project/locales/en.po",
        expect.objectContaining({ cwd: "/project" }),
      )
    })
  })
})
