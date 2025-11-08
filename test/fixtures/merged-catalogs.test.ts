import * as fs from "node:fs"
import { describe, expect, it } from "vitest"

describe("locale-module-parser should merge catalog variables", () => {
  // Starting at cwd
  const catalogFiles = fs.globSync("build/client/assets/locale-*.js")
  expect(catalogFiles).toHaveLength(5)

  it.each(catalogFiles)("should have only one JSON.parse() call in %s", catalogFile => {
    const code = fs.readFileSync(catalogFile, "utf-8")
    expect(code.match(/JSON\.parse/g)).toHaveLength(1)
  })
})
