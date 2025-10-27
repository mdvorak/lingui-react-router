import { describe, expect, it } from "vitest"
import { addToList } from "./plugin"

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
