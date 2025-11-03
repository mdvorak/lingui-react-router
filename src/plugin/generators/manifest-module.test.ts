import fs from "node:fs/promises"
import path from "node:path"
import type { ModuleInfo, OutputBundle, OutputChunk } from "rollup"
import type { ConfigPluginContext, ResolvedConfig } from "vite"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  generateBundleClient,
  generateBundleServer,
  generateManifestModule,
  getManifestChunkName,
} from "./manifest-module"

vi.mock("node:fs/promises")

function normalizePath(p: string) {
  p = path.resolve(p)
  return path.sep !== "/" ? p.replaceAll(path.sep, "/") : p
}

describe("manifest-module", () => {
  describe("generateManifestModule", () => {
    it("should return placeholder code for server builds in non-dev mode", () => {
      const result = generateManifestModule(true, "production")

      expect(result).toContain("const manifest = JSON.parse")
      expect(result).toContain("__$$_LINGUI_REACT_ROUTER_MANIFEST_PLACEHOLDER_$$__")
      expect(result).toContain("export default manifest")
    })

    it("should return placeholder code for server builds in test mode", () => {
      const result = generateManifestModule(true, "test")

      expect(result).toContain("const manifest = JSON.parse")
      expect(result).toContain("__$$_LINGUI_REACT_ROUTER_MANIFEST_PLACEHOLDER_$$__")
    })

    it("should return empty default export for server builds in dev mode", () => {
      const result = generateManifestModule(true, "dev")

      expect(result).toBe("export default {}")
    })

    it("should return empty default export for client builds", () => {
      const resultProd = generateManifestModule(false, "production")
      const resultDev = generateManifestModule(false, "dev")

      expect(resultProd).toBe("export default {}")
      expect(resultDev).toBe("export default {}")
    })
  })

  describe("getManifestChunkName", () => {
    it("should return chunk name when module contains non-empty code", () => {
      // Note: We define only the properties we need for the test
      const info = {
        id: "test-module",
        code: "const manifest = JSON.parse(`...`)\nexport default manifest",
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
      expect(mockContext.info).toHaveBeenCalledWith(
        expect.stringContaining(".client-locale-manifest.json"),
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

  describe("generateBundleServer", () => {
    let mockContext: ConfigPluginContext
    let mockConfig: ResolvedConfig

    beforeEach(() => {
      mockContext = {
        info: vi.fn(),
      } as unknown as ConfigPluginContext

      mockConfig = {
        root: "/project",
        build: {
          outDir: "/project/build/server",
        },
      } as ResolvedConfig
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it("should replace placeholder with manifest JSON in server bundle", async () => {
      const manifestJson = { en: "/locale-en-abc123.js", fr: "/locale-fr-def456.js" }
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(manifestJson))

      const bundle: OutputBundle = {
        "locale-manifest-xyz.js": {
          type: "chunk",
          name: "locale-manifest",
          fileName: "locale-manifest-xyz.js",
          code: "const manifest = JSON.parse(`__$$_LINGUI_REACT_ROUTER_MANIFEST_PLACEHOLDER_$$__`)\nexport default manifest",
          moduleIds: [],
        } as unknown as OutputChunk,
      }

      await generateBundleServer(mockContext, mockConfig, bundle)

      const chunk = bundle["locale-manifest-xyz.js"] as OutputChunk
      expect(chunk.code).not.toContain("__$$_LINGUI_REACT_ROUTER_MANIFEST_PLACEHOLDER_$$__")
      expect(chunk.code).toContain("\"en\":\"/locale-en-abc123.js\"")
      expect(chunk.code).toContain("\"fr\":\"/locale-fr-def456.js\"")
      expect(mockContext.info).toHaveBeenCalledWith(
        expect.stringContaining(".client-locale-manifest.json"),
      )
    })

    it("should read manifest from correct path", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("{}")

      const bundle: OutputBundle = {
        "locale-manifest-xyz.js": {
          type: "chunk",
          name: "locale-manifest",
          fileName: "locale-manifest-xyz.js",
          code: "const manifest = JSON.parse(`__$$_LINGUI_REACT_ROUTER_MANIFEST_PLACEHOLDER_$$__`)\nexport default manifest",
          moduleIds: [],
        } as unknown as OutputChunk,
      }

      await generateBundleServer(mockContext, mockConfig, bundle)

      expect(fs.readFile).toHaveBeenCalledWith(
        normalizePath("/project/build/.client-locale-manifest.json"),
        {
          encoding: "utf8",
        },
      )
    })

    it("should handle empty manifest", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("{}")

      const bundle: OutputBundle = {
        "locale-manifest-xyz.js": {
          type: "chunk",
          name: "locale-manifest",
          fileName: "locale-manifest-xyz.js",
          code: "const manifest = JSON.parse(`__$$_LINGUI_REACT_ROUTER_MANIFEST_PLACEHOLDER_$$__`)\nexport default manifest",
          moduleIds: [],
        } as unknown as OutputChunk,
      }

      await generateBundleServer(mockContext, mockConfig, bundle)

      const chunk = bundle["locale-manifest-xyz.js"] as OutputChunk
      expect(chunk.code).toContain("JSON.parse(`{}`)")
    })

    it("should skip chunks that are not named locale-manifest", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("{}")

      const originalCode =
        "const manifest = JSON.parse(`__$$_LINGUI_REACT_ROUTER_MANIFEST_PLACEHOLDER_$$__`)\nexport default manifest"
      const bundle: OutputBundle = {
        "other-chunk.js": {
          type: "chunk",
          name: "other-chunk",
          fileName: "other-chunk.js",
          code: originalCode,
          moduleIds: [],
        } as unknown as OutputChunk,
      }

      await generateBundleServer(mockContext, mockConfig, bundle)

      const chunk = bundle["other-chunk.js"] as OutputChunk
      expect(chunk.code).toBe(originalCode)
    })
  })
})
