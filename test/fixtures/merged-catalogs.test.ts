import * as fs from "node:fs"
import fg from "fast-glob"
import { describe, expect, it } from "vitest"

describe("locale-module-parser should merge catalog variables", async () => {
  // Starting at cwd
  const catalogFiles = await fg("build/client/assets/locale-*.js")
  expect(catalogFiles).toHaveLength(5)

  it.each(catalogFiles)("should have only one JSON.parse() call in %s", catalogFile => {
    const code = fs.readFileSync(catalogFile, "utf-8")
    expect(code.match(/JSON\.parse/g)).toHaveLength(1)
  })
})
