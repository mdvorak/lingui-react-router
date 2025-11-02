import path from "node:path"
import { describe, expect, it, vi } from "vitest"
import { resolveImportPath } from "./import-path"

describe("resolveImportPath / normalizeImportPath", () => {
  it("returns resolved path unchanged for posix-style paths", () => {
    const posixSample = "some/windows/style/path/file.js"
    const resolveSpy = vi.spyOn(path, "resolve").mockReturnValue(posixSample)

    expect(resolveImportPath("a", "b")).toBe(posixSample)

    resolveSpy.mockRestore()
  })

  it("replaces backslashes with slashes for windows-style paths", () => {
    const winPath = "C:\\project\\module\\index.js"
    const expected = "C:/project/module/index.js"
    const resolveSpy = vi.spyOn(path, "resolve").mockReturnValue(winPath)

    expect(resolveImportPath("a", "b")).toBe(expected)

    resolveSpy.mockRestore()
  })

  it("converts mixed separators to forward slashes", () => {
    const mixed = "some\\mixed/path\\file.js"
    const expected = "some/mixed/path/file.js"
    const resolveSpy = vi.spyOn(path, "resolve").mockReturnValue(mixed)

    expect(resolveImportPath("a")).toBe(expected)

    resolveSpy.mockRestore()
  })
})
