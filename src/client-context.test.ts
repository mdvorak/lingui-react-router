import type { ContextType } from "react"
import type { Location, NavigateFunction } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createLocalePathContext,
  findLocale,
  LocalePathContext,
  type PathLocale,
  stripPathnameLocalePrefix,
  usePathLocale,
} from "./client-context"

// Mock the virtual loader used by runtime.ts before importing the tested module.
// This is shorter and more direct than mocking ./runtime.
vi.mock("virtual:lingui-router-loader", () => ({
  config: {
    exclude: ["api", "static"],
    defaultLocale: "en",
    locales: ["en", "it", "en-us", "en-us-x-twain"],
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
vi.mock("react", () => {
  const react = {
    useContext: vi.fn((context: any) => context.Provider.value),
    createContext: vi.fn((defaultValue: any) => ({ Provider: { value: defaultValue } })),
  }
  return { default: react }
})

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
    expect(stripPathnameLocalePrefix("/it/about", "en")).toBe("/it/about")
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
  function setLocalePathContext(value: ContextType<typeof LocalePathContext>) {
    const context = LocalePathContext.Provider as unknown as {
      value: ContextType<typeof LocalePathContext>
    }
    context.value = value
  }

  it("returns the context value", () => {
    const contextValue: PathLocale = {
      locale: "en",
      requestLocale: undefined,
      requestPathname: "/about",
      changeLocale: () => {
      },
    }
    setLocalePathContext(contextValue)

    const result = usePathLocale()
    expect(result).toBe(contextValue)
  })

  it("throws error when used outside I18nApp component", () => {
    setLocalePathContext(null)
    expect(() => usePathLocale()).toThrowError(/must be used within a I18nApp component/i)
  })
})

describe("createLocalePathContext", () => {
  function createMockLocation(
    pathname: string,
    search = "",
    hash = "",
  ): Location<any> {
    return {
      pathname,
      search,
      hash,
      state: null,
      key: "default",
    }
  }

  let navigate: NavigateFunction

  beforeEach(() => {
    navigate = vi.fn() as NavigateFunction
  })

  describe("basic context creation", () => {
    it("creates context with localeParam and strips prefix from pathname", () => {
      const location = createMockLocation("/en/about")

      const context = createLocalePathContext(navigate, "en", "en", location)

      expect(context).toEqual({
        locale: "en",
        requestLocale: "en",
        requestPathname: "/about",
        changeLocale: expect.any(Function),
      })
    })

    it("creates context without localeParam using full pathname", () => {
      const location = createMockLocation("/about")

      const context = createLocalePathContext(navigate, undefined, "en", location)

      expect(context).toEqual({
        locale: "en",
        requestPathname: "/about",
        changeLocale: expect.any(Function),
      })
      expect(context.requestLocale).toBeUndefined()
    })

    it("handles root pathname with locale", () => {
      const location = createMockLocation("/en")

      const context = createLocalePathContext(navigate, "en", "en", location)

      expect(context.requestPathname).toBe("/")
    })

    it("handles root pathname without locale", () => {
      const location = createMockLocation("/")

      const context = createLocalePathContext(navigate, undefined, "en", location)

      expect(context.requestPathname).toBe("/")
    })

    it("handles complex pathnames with nested routes", () => {
      const location = createMockLocation("/it/products/123/details")

      const context = createLocalePathContext(navigate, "it", "it", location)

      expect(context.requestPathname).toBe("/products/123/details")
    })

    it("preserves locale in context even when different from localeParam", () => {
      const location = createMockLocation("/en-US/about")

      // Normalized locale is passed as locale param
      const context = createLocalePathContext(navigate, "en-US", "en-us", location)

      expect(context.locale).toBe("en-us")
      expect(context.requestLocale).toBe("en-us")
    })
  })

  describe("changeLocale behavior", () => {
    it("navigates to new locale with same pathname", () => {
      const location = createMockLocation("/en/about")

      const context = createLocalePathContext(navigate, "en", "en", location)
      context.changeLocale("it")

      expect(navigate).toHaveBeenCalledWith(
        { pathname: "/it/about", search: "", hash: "" },
        { preventScrollReset: true },
      )
    })

    it("preserves query parameters when changing locale", () => {
      const location = createMockLocation("/en/search", "?q=test&page=2", "")

      const context = createLocalePathContext(navigate, "en", "en", location)
      context.changeLocale("it")

      expect(navigate).toHaveBeenCalledWith(
        { pathname: "/it/search", search: "?q=test&page=2", hash: "" },
        { preventScrollReset: true },
      )
    })

    it("preserves hash fragment when changing locale", () => {
      const location = createMockLocation("/en/docs", "", "#section-1")

      const context = createLocalePathContext(navigate, "en", "en", location)
      context.changeLocale("it")

      expect(navigate).toHaveBeenCalledWith(
        { pathname: "/it/docs", search: "", hash: "#section-1" },
        { preventScrollReset: true },
      )
    })

    it("preserves both query and hash when changing locale", () => {
      const location = createMockLocation("/en/page", "?foo=bar", "#top")

      const context = createLocalePathContext(navigate, "en", "en", location)
      context.changeLocale("it")

      expect(navigate).toHaveBeenCalledWith(
        { pathname: "/it/page", search: "?foo=bar", hash: "#top" },
        { preventScrollReset: true },
      )
    })

    it("handles changing locale from root path", () => {
      const location = createMockLocation("/en")

      const context = createLocalePathContext(navigate, "en", "en", location)
      context.changeLocale("it")

      expect(navigate).toHaveBeenCalledWith(
        { pathname: "/it/", search: "", hash: "" },
        { preventScrollReset: true },
      )
    })

    it("handles undefined locale param (default locale) when changing", () => {
      const location = createMockLocation("/about")

      const context = createLocalePathContext(navigate, undefined, "en", location)
      context.changeLocale("it")

      expect(navigate).toHaveBeenCalledWith(
        { pathname: "/it/about", search: "", hash: "" },
        { preventScrollReset: true },
      )
    })

    it("handles changing to undefined locale", () => {
      const location = createMockLocation("/en/about")

      const context = createLocalePathContext(navigate, "en", "en", location)
      context.changeLocale(undefined)

      // When undefined is passed, it should remove the locale prefix and navigate to the base path
      expect(navigate).toHaveBeenCalledWith(
        { pathname: "/about", search: "", hash: "" },
        { preventScrollReset: true },
      )
    })

    it("always uses preventScrollReset option", () => {
      const location = createMockLocation("/en/page")

      const context = createLocalePathContext(navigate, "en", "en", location)
      context.changeLocale("it")

      expect(navigate).toHaveBeenCalledWith(
        { pathname: "/it/page", search: "", hash: "" },
        { preventScrollReset: true },
      )
    })

    it("handles special characters in pathname", () => {
      const location = createMockLocation("/en/search/term%20with%20spaces")

      const context = createLocalePathContext(navigate, "en", "en", location)
      context.changeLocale("it")

      expect(navigate).toHaveBeenCalledWith(
        { pathname: "/it/search/term%20with%20spaces", search: "", hash: "" },
        { preventScrollReset: true },
      )
    })

    it("handles empty requestPathname as root", () => {
      const location = createMockLocation("/en/")

      const context = createLocalePathContext(navigate, "en", "en", location)
      context.changeLocale("it")

      expect(navigate).toHaveBeenCalledWith(
        { pathname: "/it/", search: "", hash: "" },
        { preventScrollReset: true },
      )
    })

    it("does not navigate when the next pathname equals current location", () => {
      // Case 1: no locale param, changing to undefined should result in same pathname
      const location1 = createMockLocation("/about")

      const context1 = createLocalePathContext(navigate, undefined, "en", location1)
      context1.changeLocale(undefined)
      expect(navigate).not.toHaveBeenCalled()

      // Case 2: locale param present, changing to the same locale should not navigate
      navigate = vi.fn() as NavigateFunction
      const location2 = createMockLocation("/en/about")
      const context2 = createLocalePathContext(navigate, "en", "en", location2)
      context2.changeLocale("EN")
      expect(navigate).not.toHaveBeenCalled()
    })
  })

  it("normalizes next locale before navigation", () => {
    const location = createMockLocation("/en/about")

    const context = createLocalePathContext(navigate, "en", "en", location)
    context.changeLocale("en_US")

    expect(navigate).toHaveBeenCalledWith(
      { pathname: "/en-us/about", search: "", hash: "" },
      { preventScrollReset: true },
    )
  })

  it("handles localeParam that doesn't match pathname prefix", () => {
    // This might happen in edge cases with URL manipulation
    const location = createMockLocation("/about")

    const context = createLocalePathContext(navigate, "en", "en", location)
    context.changeLocale("it")

    // localeParam is "en" but pathname doesn't start with "/en"
    expect(context.requestPathname).toBe("/about")
    expect(context.requestLocale).toBe("en")

    expect(navigate).toHaveBeenCalledWith(
      { pathname: "/it/about", search: "", hash: "" },
      { preventScrollReset: true },
    )
  })

  it("handles query string with special characters", () => {
    const location = createMockLocation("/en/page", "?url=https://example.com&foo=bar+baz", "")

    const context = createLocalePathContext(navigate, "en", "en", location)
    context.changeLocale("it")

    expect(navigate).toHaveBeenCalledWith(
      { pathname: "/it/page", search: "?url=https://example.com&foo=bar+baz", hash: "" },
      { preventScrollReset: true },
    )
  })
})
