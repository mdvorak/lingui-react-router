import { describe, expect, it } from "vitest"
import { stringifyJsonToString } from "./json-helper"

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
