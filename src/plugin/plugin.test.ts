import { beforeEach, describe, expect, it, vi } from "vitest"
import { generateBundleClient, generateBundleServer } from "./generators/manifest-module"
import {
  generateLoaderModuleClient,
  generateLoaderModuleServer,
  generateLocaleMapping,
  generateDetectLocale,
  generateEmptyLocaleMapping,
} from "./generators/loader-module"
import { addToList, linguiRouterPlugin } from "./plugin"
import {
  PLUGIN_NAME,
  VIRTUAL_LOADER,
  VIRTUAL_LOCALE_PREFIX,
  VIRTUAL_MANIFEST,
} from "./plugin-config"

// Mock the generator modules
vi.mock("./generators/manifest-module", () => ({
  generateBundleClient: vi.fn(),
  generateBundleServer: vi.fn(),
  generateManifestModule: vi.fn(),
  getManifestChunkName: vi.fn(() => "manifest-chunk"),
}))

// Mock loader-module so we can assert generateLocaleMapping / generateDetectLocale
vi.mock("./generators/loader-module", () => ({
  generateLoaderModuleClient: vi.fn().mockResolvedValue(["CLIENT_LOADER_LINE"]),
  generateLoaderModuleServer: vi.fn().mockResolvedValue(["SERVER_LOADER_LINE"]),
  generateLocaleMapping: vi.fn().mockResolvedValue(["LOCALE_MAPPING_LINE"]),
  generateDetectLocale: vi.fn().mockReturnValue(["DETECT_LOCALE_LINE"]),
  buildConfig: vi.fn().mockReturnValue({}),
  generateEmptyLocaleMapping: vi.fn().mockReturnValue(["EMPTY_LOCALE_MAPPING"]),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

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
    locales: ["zh", "es"],
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

describe("linguiRouterPlugin - config", () => {
  it("should add plugin to dedupe list", () => {
    const plugin = linguiRouterPlugin()
    const userConfig = {} as any

    const result = plugin.config(userConfig)

    expect(result.resolve?.dedupe).toContain(PLUGIN_NAME)
  })

  it("should preserve existing dedupe entries", () => {
    const plugin = linguiRouterPlugin()
    const userConfig = {
      resolve: {
        dedupe: ["react", "react-dom"],
      },
    } as any

    const result = plugin.config(userConfig)

    expect(result.resolve?.dedupe).toEqual(["react", "react-dom", PLUGIN_NAME])
  })

  it("should configure manualChunks for locale and manifest modules", () => {
    const plugin = linguiRouterPlugin()
    const userConfig = {} as any

    const result = plugin.config(userConfig)

    expect(result.build?.rollupOptions?.output?.manualChunks).toBeDefined()
  })

  it("should include plugin in ssr.noExternal", () => {
    const plugin = linguiRouterPlugin()
    const userConfig = {} as any

    const result = plugin.config(userConfig)

    expect(result.ssr?.noExternal).toContain(PLUGIN_NAME)
  })

  it("should preserve existing ssr.noExternal array", () => {
    const plugin = linguiRouterPlugin()
    const userConfig = {
      ssr: {
        noExternal: ["other-package"],
      },
    } as any

    const result = plugin.config(userConfig)

    expect(result.ssr?.noExternal).toEqual(["other-package", PLUGIN_NAME])
  })

  it("should keep ssr.noExternal as true when already true", () => {
    const plugin = linguiRouterPlugin()
    const userConfig = {
      ssr: {
        noExternal: true,
      },
    } as any

    const result = plugin.config(userConfig)

    expect(result.ssr?.noExternal).toBe(true)
  })

  it("should include negotiator in ssr.optimizeDeps.include", () => {
    const plugin = linguiRouterPlugin()
    const userConfig = {} as any

    const result = plugin.config(userConfig)

    expect(result.ssr?.optimizeDeps?.include).toContain("negotiator")
  })

  it("should preserve existing ssr.optimizeDeps.include entries", () => {
    const plugin = linguiRouterPlugin()
    const userConfig = {
      ssr: {
        optimizeDeps: {
          include: ["other-dep"],
        },
      },
    } as any

    const result = plugin.config(userConfig)

    expect(result.ssr?.optimizeDeps?.include).toContain("negotiator")
    expect(result.ssr?.optimizeDeps?.include).toContain("other-dep")
  })

  describe("manualChunks", () => {
    it("should return manifest chunk name for virtual manifest module", () => {
      const plugin = linguiRouterPlugin()
      const userConfig = {} as any

      const result = plugin.config(userConfig)
      const manualChunks = result.build?.rollupOptions?.output?.manualChunks

      const mockModuleInfo = {
        importers: [],
        dynamicImporters: [],
      }
      const getModuleInfo = vi.fn().mockReturnValue(mockModuleInfo)

      const chunkName = manualChunks("\0" + VIRTUAL_MANIFEST, { getModuleInfo })

      expect(getModuleInfo).toHaveBeenCalledWith("\0" + VIRTUAL_MANIFEST)
      expect(chunkName).toBeDefined()
    })

    it("should return locale chunk name for virtual locale modules", () => {
      const plugin = linguiRouterPlugin()
      const userConfig = {} as any

      const result = plugin.config(userConfig)
      const manualChunks = result.build?.rollupOptions?.output?.manualChunks

      const getModuleInfo = vi.fn()

      expect(manualChunks("\0" + VIRTUAL_LOCALE_PREFIX + "en", { getModuleInfo })).toBe("locale-en")
      expect(manualChunks("\0" + VIRTUAL_LOCALE_PREFIX + "fr", { getModuleInfo })).toBe("locale-fr")
      expect(manualChunks("\0" + VIRTUAL_LOCALE_PREFIX + "de-de", { getModuleInfo })).toBe(
        "locale-de-de",
      )
      expect(manualChunks("\0" + VIRTUAL_LOCALE_PREFIX + "zh-CN", { getModuleInfo })).toBe(
        "locale-zh-CN",
      )
    })

    it("should return undefined for non-virtual modules", () => {
      const plugin = linguiRouterPlugin()
      const userConfig = {} as any

      const result = plugin.config(userConfig)
      const manualChunks = result.build?.rollupOptions?.output?.manualChunks

      const getModuleInfo = vi.fn()

      expect(manualChunks("react", { getModuleInfo })).toBeUndefined()
      expect(manualChunks("./some-file.ts", { getModuleInfo })).toBeUndefined()
      expect(manualChunks("@lingui/react", { getModuleInfo })).toBeUndefined()
    })

    it("should throw error when module info not found for manifest", () => {
      const plugin = linguiRouterPlugin()
      const userConfig = {} as any

      const result = plugin.config(userConfig)
      const manualChunks = result.build?.rollupOptions?.output?.manualChunks

      const getModuleInfo = vi.fn().mockReturnValue(null)

      expect(() => {
        manualChunks("\0" + VIRTUAL_MANIFEST, { getModuleInfo })
      }).toThrow(`Module info not found for \\0${VIRTUAL_MANIFEST}`)
    })
  })
})

describe("linguiRouterPlugin - resolveId", () => {
  it("should resolve virtual manifest module", () => {
    const plugin = linguiRouterPlugin()

    const result = plugin.resolveId(VIRTUAL_MANIFEST)

    expect(result).toBe("\0" + VIRTUAL_MANIFEST)
  })

  it("should resolve virtual loader module", () => {
    const plugin = linguiRouterPlugin()

    const result = plugin.resolveId(VIRTUAL_LOADER)

    expect(result).toBe("\0" + VIRTUAL_LOADER)
  })

  it("should resolve virtual locale modules", () => {
    const plugin = linguiRouterPlugin()

    const result = plugin.resolveId(VIRTUAL_LOCALE_PREFIX + "en")

    expect(result).toBe("\0" + VIRTUAL_LOCALE_PREFIX + "en")
  })

  it("should resolve locale modules with different locales", () => {
    const plugin = linguiRouterPlugin()

    expect(plugin.resolveId(VIRTUAL_LOCALE_PREFIX + "fr")).toBe("\0" + VIRTUAL_LOCALE_PREFIX + "fr")
    expect(plugin.resolveId(VIRTUAL_LOCALE_PREFIX + "de-de")).toBe(
      "\0" + VIRTUAL_LOCALE_PREFIX + "de-de",
    )
    expect(plugin.resolveId(VIRTUAL_LOCALE_PREFIX + "zh-CN")).toBe(
      "\0" + VIRTUAL_LOCALE_PREFIX + "zh-CN",
    )
  })

  it("should not resolve non-virtual modules", () => {
    const plugin = linguiRouterPlugin()

    expect(plugin.resolveId("react")).toBeUndefined()
    expect(plugin.resolveId("./some-file.ts")).toBeUndefined()
    expect(plugin.resolveId("@lingui/react")).toBeUndefined()
  })
})

describe("linguiRouterPlugin - generateBundle", () => {
  it("should call generateBundleClient for client environment", async () => {
    const plugin = linguiRouterPlugin()
    const mockContext = {
      environment: {
        name: "client",
        config: {
          linguiRouterConfig: {
            locales: ["en", "fr"],
            defaultLocale: "en",
          },
        },
      },
    }
    const mockBundle = {}

    await plugin.generateBundle.call(mockContext, {}, mockBundle)

    expect(generateBundleClient).toHaveBeenCalledTimes(1)
    expect(generateBundleClient).toHaveBeenCalledWith(
      mockContext,
      mockContext.environment.config,
      mockBundle,
    )
  })

  it("should call generateBundleServer for server environment", async () => {
    const plugin = linguiRouterPlugin()
    const mockContext = {
      environment: {
        name: "ssr",
        config: {
          linguiRouterConfig: {
            locales: ["en", "fr"],
            defaultLocale: "en",
          },
        },
      },
    }
    const mockBundle = {}

    await plugin.generateBundle.call(mockContext, {}, mockBundle)

    expect(generateBundleServer).toHaveBeenCalledTimes(1)
    expect(generateBundleServer).toHaveBeenCalledWith(
      mockContext,
      mockContext.environment.config,
      mockBundle,
    )
  })

  it("should not call client generator for non-client environment", async () => {
    const plugin = linguiRouterPlugin()
    const mockContext = {
      environment: {
        name: "ssr",
        config: {
          linguiRouterConfig: {
            locales: ["en"],
            defaultLocale: "en",
          },
        },
      },
    }

    await plugin.generateBundle.call(mockContext, {}, {})

    expect(generateBundleClient).not.toHaveBeenCalled()
    expect(generateBundleServer).toHaveBeenCalledTimes(1)
  })

  it("should not call server generator for client environment", async () => {
    const plugin = linguiRouterPlugin()
    const mockContext = {
      environment: {
        name: "client",
        config: {
          linguiRouterConfig: {
            locales: ["en"],
            defaultLocale: "en",
          },
        },
      },
    }

    await plugin.generateBundle.call(mockContext, {}, {})

    expect(generateBundleServer).not.toHaveBeenCalled()
    expect(generateBundleClient).toHaveBeenCalledTimes(1)
  })
})

describe("linguiRouterPlugin - load", () => {
  it("should load server loader and include locale mapping and detect lines", async () => {
    const plugin = linguiRouterPlugin()

    const mockConfig = {
      linguiRouterConfig: {
        locales: ["en"],
        defaultLocale: "en",
        detectLocale: true,
      },
    }

    const mockContext: any = {
      environment: {
        name: "ssr",
        mode: "production",
        config: mockConfig,
      },
      warn: vi.fn(),
    }

    const result = await plugin.load.call(mockContext, "\0" + VIRTUAL_LOADER)

    expect(generateLoaderModuleServer).toHaveBeenCalledTimes(1)
    expect(generateLocaleMapping).toHaveBeenCalledTimes(1)
    expect(generateEmptyLocaleMapping).not.toHaveBeenCalled()
    expect(generateDetectLocale).toHaveBeenCalledWith(true)
    expect(result).toContain("SERVER_LOADER_LINE")
    expect(result).toContain("LOCALE_MAPPING_LINE")
    expect(result).toContain("DETECT_LOCALE_LINE")
  })

  it("should load client loader in production and not include locale mapping but include detect noop", async () => {
    const plugin = linguiRouterPlugin()

    const mockConfig = {
      linguiRouterConfig: {
        locales: ["en"],
        defaultLocale: "en",
        detectLocale: true,
      },
    }

    const mockContext: any = {
      environment: {
        name: "client",
        mode: "production",
        config: mockConfig,
      },
      warn: vi.fn(),
    }

    const result = await plugin.load.call(mockContext, "\0" + VIRTUAL_LOADER)

    expect(generateLoaderModuleClient).toHaveBeenCalledTimes(1)
    // Not called because not server and not dev
    expect(generateLocaleMapping).not.toHaveBeenCalled()
    expect(generateEmptyLocaleMapping).toHaveBeenCalledTimes(1)
    // server && detectLocale -> false
    expect(generateDetectLocale).toHaveBeenCalledWith(false)
    expect(result).toContain("CLIENT_LOADER_LINE")
    expect(result).toContain("EMPTY_LOCALE_MAPPING")
    expect(result).toContain("DETECT_LOCALE_LINE")
  })

  it("should include locale mapping for client dev mode", async () => {
    const plugin = linguiRouterPlugin()

    const mockConfig = {
      linguiRouterConfig: {
        locales: ["en"],
        defaultLocale: "en",
        detectLocale: false,
      },
    }

    const mockContext: any = {
      environment: {
        name: "client",
        mode: "dev",
        config: mockConfig,
      },
      warn: vi.fn(),
    }

    const result = await plugin.load.call(mockContext, "\0" + VIRTUAL_LOADER)

    expect(generateLoaderModuleClient).toHaveBeenCalledTimes(1)
    // mode === 'dev' -> locale mapping included
    expect(generateLocaleMapping).toHaveBeenCalledTimes(1)
    expect(generateEmptyLocaleMapping).not.toHaveBeenCalled()
    // server && detectLocale -> false
    expect(generateDetectLocale).toHaveBeenCalledWith(false)
    expect(result).toContain("CLIENT_LOADER_LINE")
    expect(result).toContain("LOCALE_MAPPING_LINE")
    expect(result).toContain("DETECT_LOCALE_LINE")
  })
})
