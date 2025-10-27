import { describe, expect, it } from "vitest"
import { normalizeLocaleKey } from "./config"

describe("normalizeLocaleKey", () => {
  it("converts uppercase to lowercase", () => {
    expect(normalizeLocaleKey("EN")).toBe("en")
    expect(normalizeLocaleKey("IT")).toBe("it")
  })

  it("replaces underscores with hyphens", () => {
    expect(normalizeLocaleKey("en_US")).toBe("en-us")
    expect(normalizeLocaleKey("zh_CN")).toBe("zh-cn")
  })

  it("converts uppercase and replaces underscores simultaneously", () => {
    expect(normalizeLocaleKey("EN_US")).toBe("en-us")
    expect(normalizeLocaleKey("ZH_CN")).toBe("zh-cn")
    expect(normalizeLocaleKey("PT_BR")).toBe("pt-br")
  })

  it("handles already normalized locales", () => {
    expect(normalizeLocaleKey("en")).toBe("en")
    expect(normalizeLocaleKey("en-us")).toBe("en-us")
    expect(normalizeLocaleKey("zh-cn")).toBe("zh-cn")
  })

  it("handles mixed case with hyphens", () => {
    expect(normalizeLocaleKey("en-US")).toBe("en-us")
    expect(normalizeLocaleKey("En-Us")).toBe("en-us")
  })

  it("handles multiple underscores", () => {
    expect(normalizeLocaleKey("en_US_POSIX")).toBe("en-us-posix")
  })

  it("handles empty string", () => {
    expect(normalizeLocaleKey("")).toBe("")
  })

  it("handles locale with script codes", () => {
    expect(normalizeLocaleKey("zh_Hans_CN")).toBe("zh-hans-cn")
    expect(normalizeLocaleKey("SR_CYRL_RS")).toBe("sr-cyrl-rs")
  })
})
