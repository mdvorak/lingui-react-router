import { type Location, useLocation, useParams } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { findLocale, stripPathnameLocalePrefix, usePathLocale } from "./i18n"

// Mock the virtual loader used by runtime.ts before importing the tested module.
// This is shorter and more direct than mocking ./runtime.
vi.mock("virtual:lingui-router-loader", () => ({
  config: {
    exclude: ["api", "static"],
    defaultLocale: "en",
    locales: ["en", "fr", "en-us", "en-us-x-twain"],
    localeParamName: "locale",
  },
  $useLingui: vi.fn(),
  // localeMapping keys should be normalized keys as findLocale looks up by normalized locale
  localeMapping: {
    a: "b",
    b: "en",
    english: "en-us",
    // circular mapping to test cycle detection
    c: "d",
    d: "c",
  },
  // empty loaders are fine for these tests
  localeLoaders: {},
}))

// Mock react hooks to avoid DOM dependency
vi.mock("react", () => ({
  useMemo: vi.fn(fn => fn()),
}))

// Mock react-router hooks
vi.mock("react-router", () => ({
  useLocation: vi.fn(),
  useParams: vi.fn(),
}))

describe("findLocale", () => {
  it("returns no locale when localeParam is undefined", () => {
    expect(findLocale(undefined)).toEqual({ excluded: false })
  })

  it("finds a simple locale", () => {
    expect(findLocale("en")).toEqual({ locale: "en", excluded: false })
  })

  it("finds a country-code locale (normalized)", () => {
    expect(findLocale("en-US")).toEqual({ locale: "en-us", excluded: false })
  })

  it("normalizes locale keys during search", () => {
    expect(findLocale("en_US")).toEqual({ locale: "en-us", excluded: false })
  })

  it("marks excluded prefixes as excluded", () => {
    expect(findLocale("api")).toEqual({ excluded: true })
  })

  it("returns undefined-like result (no locale) for unknown locale", () => {
    expect(findLocale("de")).toEqual({ excluded: false })
  })

  it("resolves mapping chains", () => {
    expect(findLocale("a")).toEqual({ locale: "en", excluded: false })
  })

  it("handles long/extended locale codes", () => {
    const longLocale = "en-US-x-twain"
    expect(findLocale(longLocale)).toEqual({ locale: "en-us-x-twain", excluded: false })
  })

  it("handles edge-case inputs and returns expected results", () => {
    const testCases: Array<{ input: string; expected: { locale?: string; excluded: boolean } }> = [
      { input: "", expected: { excluded: false } },
      { input: "/", expected: { excluded: false } },
      { input: "//", expected: { excluded: false } },
      { input: "///", expected: { excluded: false } },
      { input: "en", expected: { locale: "en", excluded: false } },
      { input: "EN", expected: { locale: "en", excluded: false } },
    ]

    testCases.forEach(({ input, expected }) => {
      expect(findLocale(input)).toEqual(expected)
    })
  })

  it("does not infinite loop on circular localeMapping", () => {
    expect(() => findLocale("c")).toThrowError(/Circular localeMapping detected/i)
  })
})

describe("stripPathnameLocalePrefix", () => {
  it("strips locale prefix from pathname when localeParam matches", () => {
    expect(stripPathnameLocalePrefix("/en/about", "en")).toBe("/about")
  })

  it("strips locale with country code when passed exactly", () => {
    expect(stripPathnameLocalePrefix("/en-US/about", "en-US")).toBe("/about")
  })

  it("strips when localeParam contains underscore (raw param passed through)", () => {
    expect(stripPathnameLocalePrefix("/en_US/about", "en_US")).toBe("/about")
  })

  it("handles root pathname with locale", () => {
    expect(stripPathnameLocalePrefix("/en", "en")).toBe("/")
  })

  it("handles trailing slash after locale", () => {
    expect(stripPathnameLocalePrefix("/en/", "en")).toBe("/")
  })

  it("does not strip when locale doesn't match exactly", () => {
    expect(stripPathnameLocalePrefix("/fr/about", "en")).toBe("/fr/about")
  })

  it("does not strip locale in middle of path", () => {
    expect(stripPathnameLocalePrefix("/about/en/page", "en")).toBe("/about/en/page")
  })

  it("preserves query strings and hashes", () => {
    expect(stripPathnameLocalePrefix("/en/about?foo=bar#section", "en")).toBe(
      "/about?foo=bar#section",
    )
  })

  it("is case-sensitive relative to the passed localeParam (matches exact param)", () => {
    expect(stripPathnameLocalePrefix("/EN/about", "EN")).toBe("/about")
    expect(stripPathnameLocalePrefix("/EN/about", "en")).toBe("/EN/about")
  })

  it("handles edge-case pathnames and returns expected stripped pathnames", () => {
    const testCases: Array<{ pathname: string; locale: string; expected: string }> = [
      { pathname: "/en/en/about", locale: "en", expected: "/en/about" },
      { pathname: "///en/about", locale: "en", expected: "///en/about" },
      { pathname: "/en//about", locale: "en", expected: "//about" },
      { pathname: "/en/", locale: "en", expected: "/" },
      { pathname: "/en", locale: "en", expected: "/" },
      { pathname: "/", locale: "en", expected: "/" },
    ]

    testCases.forEach(({ pathname, locale, expected }) => {
      expect(stripPathnameLocalePrefix(pathname, locale)).toBe(expected)
    })
  })
})

describe("usePathLocale", () => {
  let location: Location
  let params: Record<string, string | undefined>

  beforeEach(() => {
    location = {
      pathname: "/about",
      search: "",
      hash: "",
      state: null,
      key: "default",
    }
    params = {}

    vi.mocked(useParams).mockReturnValue(params)
    vi.mocked(useLocation).mockReturnValue(location)
  })

  it("returns default locale when no locale param is present", () => {
    const result = usePathLocale()

    expect(result).toEqual({
      locale: "en",
      requestLocale: undefined,
      requestPathname: "/about",
    })
  })

  it("returns resolved locale and strips pathname prefix when locale param is present", () => {
    params.locale = "fr"
    location.pathname = "/fr/products"

    const result = usePathLocale()

    expect(result).toEqual({
      locale: "fr",
      requestLocale: "fr",
      requestPathname: "/products",
    })
  })

  it("normalizes locale param and strips pathname prefix", () => {
    params.locale = "en-US"
    location.pathname = "/en-US/products"

    const result = usePathLocale()

    expect(result).toEqual({
      locale: "en-us",
      requestLocale: "en-us",
      requestPathname: "/products",
    })
  })

  it("handles locale mapping and strips pathname prefix", () => {
    params.locale = "a"
    location.pathname = "/a/dashboard"

    const result = usePathLocale()

    expect(result).toEqual({
      locale: "en",
      requestLocale: "en",
      requestPathname: "/dashboard",
    })
  })

  it("falls back to default locale for unknown locale param and preserves pathname", () => {
    params.locale = "de"
    location.pathname = "/de/home"

    const result = usePathLocale()

    expect(result).toEqual({
      locale: "en",
      requestLocale: undefined,
      requestPathname: "/de/home",
    })
  })

  it("handles root pathname with locale", () => {
    params.locale = "fr"
    location.pathname = "/fr"

    const result = usePathLocale()

    expect(result).toEqual({
      locale: "fr",
      requestLocale: "fr",
      requestPathname: "/",
    })
  })

  it("handles root pathname with locale and trailing slash", () => {
    params.locale = "fr"
    location.pathname = "/fr/"

    const result = usePathLocale()

    expect(result).toEqual({
      locale: "fr",
      requestLocale: "fr",
      requestPathname: "/",
    })
  })

  it("preserves query strings and hashes in requestPathname", () => {
    params.locale = "en"
    location.pathname = "/en/about"
    location.search = "?foo=bar"
    location.hash = "#section"

    const result = usePathLocale()

    expect(result).toEqual({
      locale: "en",
      requestLocale: "en",
      requestPathname: "/about",
    })
  })

  it("handles extended locale codes", () => {
    params.locale = "en-US-x-twain"
    location.pathname = "/en-US-x-twain/page"

    const result = usePathLocale()

    expect(result).toEqual({
      locale: "en-us-x-twain",
      requestLocale: "en-us-x-twain",
      requestPathname: "/page",
    })
  })
})
