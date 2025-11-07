import fs from "node:fs/promises"
import path from "node:path"
import type { ModuleInfo, OutputBundle, OutputChunk } from "rollup"
import type { ConfigPluginContext, ResolvedConfig } from "vite"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  generateBundleClient,
  generateEmptyManifestModule,
  generateManifestModule,
  getManifestChunkName,
  stringifyJsonToString,
} from "./manifest-module"

vi.mock("node:fs/promises")

function normalizePath(p: string) {
  p = path.resolve(p)
  return path.sep !== "/" ? p.replaceAll(path.sep, "/") : p
}

describe("manifest-module", () => {
  describe("generateManifestModule", () => {
    let mockContext: ConfigPluginContext
    let mockConfig: ResolvedConfig

    beforeEach(() => {
      mockContext = {
        info: vi.fn(),
      } as unknown as ConfigPluginContext

      mockConfig = {
        root: "/project",
        build: {
          outDir: "/project/build/client",
        },
      } as ResolvedConfig

      // Default fs.readFile behaviour for most tests
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ en: "/locale-en-abc123.js" }))
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it("should read manifest file and return parsed module code", async () => {
      const manifestJson = { en: "/locale-en-abc123.js" }
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(manifestJson))

      const result = await generateManifestModule(mockContext, mockConfig)

      const expected = `export default JSON.parse(${JSON.stringify(JSON.stringify(manifestJson))})`
      expect(result).toBe(expected)
      expect(fs.readFile).toHaveBeenCalled()
    })

    it("should throw when manifest file contains invalid JSON", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("invalid json")
      await expect(generateManifestModule(mockContext, mockConfig)).rejects.toThrow()
    })

    it("generateEmptyManifestModule should return empty default export", () => {
      const result = generateEmptyManifestModule()
      expect(result).toBe("export default {}")
    })
  })

  describe("getManifestChunkName", () => {
    it("should return chunk name when module contains non-empty code", () => {
      // Note: We define only the properties we need for the test
      const info = {
        id: "test-module",
        code: "export default JSON.parse(\"...\")",
      } as unknown as ModuleInfo

      const result = getManifestChunkName(info)

      expect(result).toBe("locale-manifest")
    })

    it("should return undefined when module contains empty default export", () => {
      // Note: We define only the properties we need for the test
      const info = {
        id: "test-module",
        code: "export default {}",
      } as unknown as ModuleInfo

      const result = getManifestChunkName(info)

      expect(result).toBeUndefined()
    })

    it("should return chunk name when module has no code", () => {
      // Note: We define only the properties we need for the test
      const info = {
        id: "test-module",
        code: null,
      } as unknown as ModuleInfo

      const result = getManifestChunkName(info)

      expect(result).toBe("locale-manifest")
    })
  })

  describe("generateBundleClient", () => {
    let mockContext: ConfigPluginContext
    let mockConfig: ResolvedConfig

    beforeEach(() => {
      mockContext = {
        info: vi.fn(),
      } as unknown as ConfigPluginContext

      mockConfig = {
        root: "/project",
        base: "/",
        build: {
          outDir: "/project/build/client",
        },
      } as ResolvedConfig

      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it("should generate locale manifest from dynamic locale chunks", async () => {
      const bundle: OutputBundle = {
        "locale-en-abc123.js": {
          type: "chunk",
          isDynamicEntry: true,
          fileName: "locale-en-abc123.js",
          moduleIds: ["\0virtual:lingui-router-locale-en"],
        } as unknown as OutputChunk,
        "locale-fr-def456.js": {
          type: "chunk",
          isDynamicEntry: true,
          fileName: "locale-fr-def456.js",
          moduleIds: ["\0virtual:lingui-router-locale-fr"],
        } as unknown as OutputChunk,
        "main-xyz789.js": {
          type: "chunk",
          isDynamicEntry: false,
          fileName: "main-xyz789.js",
          moduleIds: ["src/main.ts"],
        } as unknown as OutputChunk,
      }

      await generateBundleClient(mockContext, mockConfig, bundle)

      expect(fs.mkdir).toHaveBeenCalledWith(normalizePath("/project/build"), { recursive: true })
      expect(fs.writeFile).toHaveBeenCalledWith(
        normalizePath("/project/build/.client-locale-manifest.json"),
        expect.stringContaining("\"en\": \"/locale-en-abc123.js\""),
        { encoding: "utf8" },
      )
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("\"fr\": \"/locale-fr-def456.js\""),
        expect.any(Object),
      )
    })

    it("should handle base path in manifest URLs", async () => {
      const customConfig = {
        ...mockConfig,
        base: "/app/",
      } as ResolvedConfig

      const bundle: OutputBundle = {
        "locale-en-abc123.js": {
          type: "chunk",
          isDynamicEntry: true,
          fileName: "locale-en-abc123.js",
          moduleIds: ["\0virtual:lingui-router-locale-en"],
        } as unknown as OutputChunk,
      }

      await generateBundleClient(mockContext, customConfig, bundle)

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("\"/app/locale-en-abc123.js\""),
        expect.any(Object),
      )
    })

    it("should handle locale codes with hyphens", async () => {
      const bundle: OutputBundle = {
        "locale-en-us-abc123.js": {
          type: "chunk",
          isDynamicEntry: true,
          fileName: "locale-en-us-abc123.js",
          moduleIds: ["\0virtual:lingui-router-locale-en-us"],
        } as unknown as OutputChunk,
      }

      await generateBundleClient(mockContext, mockConfig, bundle)

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("\"en-us\": \"/locale-en-us-abc123.js\""),
        expect.any(Object),
      )
    })

    it("should ignore non-dynamic chunks", async () => {
      const bundle: OutputBundle = {
        "main-xyz789.js": {
          type: "chunk",
          isDynamicEntry: false,
          fileName: "main-xyz789.js",
          moduleIds: ["\0virtual:lingui-router-locale-en"],
        } as unknown as OutputChunk,
      }

      await generateBundleClient(mockContext, mockConfig, bundle)

      expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), "{}", expect.any(Object))
    })

    it("should ignore chunks without locale module IDs", async () => {
      const bundle: OutputBundle = {
        "component-abc123.js": {
          type: "chunk",
          isDynamicEntry: true,
          fileName: "component-abc123.js",
          moduleIds: ["src/component.tsx"],
        } as unknown as OutputChunk,
      }

      await generateBundleClient(mockContext, mockConfig, bundle)

      expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), "{}", expect.any(Object))
    })
  })
})

describe("stringifyJsonToString", () => {
  it("should stringify empty JSON object", () => {
    const result = stringifyJsonToString({})
    expect(result).toBe(`"{}"`)
  })

  it("should stringify JSON object to escaped string", () => {
    const manifestJson = { key: "value`$\"", nested: { a: 3 } }
    const result = stringifyJsonToString(manifestJson)

    expect(result).toBe(`"{\\"key\\":\\"value\`$\\\\\\"\\",\\"nested\\":{\\"a\\":3}}"`)
  })
})
