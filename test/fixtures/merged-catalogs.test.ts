import * as fs from "node:fs"
import fg from "fast-glob"
import { beforeAll, describe, expect, it } from "vitest"

describe("locale-module-parser should merge catalog variables", () => {
  // Starting at cwd
  let catalogFiles: string[] = []

  beforeAll(async () => {
    catalogFiles = await fg("build/client/assets/locale-*.js")
  })

  it("should find 5 catalog files", () => {
    expect(catalogFiles).toHaveLength(5)
  })

  it.each(catalogFiles)("should have only one JSON.parse() call in %s", catalogFile => {
    const code = fs.readFileSync(catalogFile, "utf-8")
    expect(code.match(/JSON\.parse/g)).toHaveLength(1)
  })
})
