import { i18n, type I18n } from "@lingui/core"
import { describe, expect, it, vi } from "vitest"
import { changeLocaleRedirect, createRequestContext } from "./server-context"

describe("changeLocaleRedirect", () => {
  it("should redirect to target locale with request pathname", () => {
    const url = new URL("https://example.com/about")
    const response = changeLocaleRedirect("fr", "/about", url)

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/fr/about")
  })

  it("should redirect to root path when locale is undefined", () => {
    const url = new URL("https://example.com/about")
    const response = changeLocaleRedirect(undefined, "/about", url)

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/about")
  })

  it("should preserve query parameters", () => {
    const url = new URL("https://example.com/products?category=shoes&size=10")
    const response = changeLocaleRedirect("es", "/products", url)

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/es/products?category=shoes&size=10")
  })

  it("should preserve hash fragments", () => {
    const url = new URL("https://example.com/docs#section-2")
    const response = changeLocaleRedirect("de", "/docs", url)

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/de/docs#section-2")
  })

  it("should preserve both query parameters and hash fragments", () => {
    const url = new URL("https://example.com/page?foo=bar#anchor")
    const response = changeLocaleRedirect("it", "/page", url)

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/it/page?foo=bar#anchor")
  })

  it("should handle root pathname", () => {
    const url = new URL("https://example.com/")
    const response = changeLocaleRedirect("ja", "/", url)

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/ja/")
  })

  it("should handle nested pathnames", () => {
    const url = new URL("https://example.com/products/category/item")
    const response = changeLocaleRedirect("pt", "/products/category/item", url)

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/pt/products/category/item")
  })

  it("should handle locale with region codes", () => {
    const url = new URL("https://example.com/contact")
    const response = changeLocaleRedirect("en-GB", "/contact", url)

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/en-GB/contact")
  })

  it("should handle empty query string and hash", () => {
    const url = new URL("https://example.com/about")
    const response = changeLocaleRedirect("zh", "/about", url)

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/zh/about")
  })
})

describe("changeLocale method in createRequestContext", () => {
  const mockI18n = {
    _: vi.fn((id: string) => id),
  } as unknown as I18n

  it("should create context with changeLocale method that redirects to new locale", () => {
    const url = new URL("https://example.com/products")
    const context = createRequestContext({
      locale: "en",
      i18n: mockI18n,
      url,
      requestLocale: "en",
      requestPathname: "/products",
    })

    const response = context.changeLocale("fr")

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/fr/products")
  })

  it("should change locale and preserve query parameters", () => {
    const url = new URL("https://example.com/search?q=test")
    const context = createRequestContext({
      locale: "en",
      i18n: mockI18n,
      url,
      requestLocale: "en",
      requestPathname: "/search",
    })

    const response = context.changeLocale("de")

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/de/search?q=test")
  })

  it("should change locale and preserve hash", () => {
    const url = new URL("https://example.com/docs#intro")
    const context = createRequestContext({
      locale: "en",
      i18n: mockI18n,
      url,
      requestLocale: "en",
      requestPathname: "/docs",
    })

    const response = context.changeLocale("es")

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/es/docs#intro")
  })

  it("should change to undefined locale (remove locale prefix)", () => {
    const url = new URL("https://example.com/en/about")
    const context = createRequestContext({
      locale: "en",
      i18n: mockI18n,
      url,
      requestLocale: "en",
      requestPathname: "/about",
    })

    const response = context.changeLocale(undefined)

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/about")
  })

  it("should handle changing locale on root path", () => {
    const url = new URL("https://example.com/")
    const context = createRequestContext({
      locale: "en",
      i18n: mockI18n,
      url,
      requestLocale: "en",
      requestPathname: "/",
    })

    const response = context.changeLocale("it")

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/it/")
  })

  it("should handle changing locale with complex URL", () => {
    const url = new URL("https://example.com/products/category?sort=price&order=asc#details")
    const context = createRequestContext({
      locale: "en",
      i18n: mockI18n,
      url,
      requestLocale: "en",
      requestPathname: "/products/category",
    })

    const response = context.changeLocale("ja")

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/ja/products/category?sort=price&order=asc#details")
  })

  it("should handle locale with region code", () => {
    const url = new URL("https://example.com/contact")
    const context = createRequestContext({
      locale: "en-US",
      i18n: mockI18n,
      url,
      requestLocale: "en-US",
      requestPathname: "/contact",
    })

    const response = context.changeLocale("en-GB")

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/en-GB/contact")
  })

  it("should preserve all context properties when using changeLocale", () => {
    const url = new URL("https://example.com/test")
    const context = createRequestContext({
      locale: "en",
      i18n: mockI18n,
      url,
      requestLocale: "en",
      requestPathname: "/test",
    })

    context.changeLocale("it")

    // Verify context has all expected properties
    expect(context.locale).toBe("en")
    expect(context.requestLocale).toBe("en")
    expect(context.requestPathname).toBe("/test")
    expect(context.url).toBe(url)
  })
})

describe("redirect method in createRequestContext", () => {
  it("redirects to a path without locale prefix when requestLocale is undefined", () => {
    const context = createRequestContext({
      locale: "en",
      i18n: i18n,
      url: new URL("http://localhost/about"),
      requestLocale: undefined,
      requestPathname: "/about",
    })

    const response = context.redirect("/contact")
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/contact")
  })

  it("redirects to a path with locale prefix when requestLocale is defined", () => {
    const context = createRequestContext({
      locale: "fr",
      i18n: i18n,
      url: new URL("http://localhost/fr/about"),
      requestLocale: "fr",
      requestPathname: "/about",
    })

    const response = context.redirect("/contact")
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/fr/contact")
  })

  it("redirects with custom status code", () => {
    const context = createRequestContext({
      locale: "en",
      i18n: i18n,
      url: new URL("http://localhost/en/about"),
      requestLocale: "en",
      requestPathname: "/about",
    })

    const response = context.redirect("/contact", 301)
    expect(response.status).toBe(301)
    expect(response.headers.get("Location")).toBe("/en/contact")
  })

  it("redirects with ResponseInit options", () => {
    const context = createRequestContext({
      locale: "en",
      i18n: i18n,
      url: new URL("http://localhost/en/about"),
      requestLocale: "en",
      requestPathname: "/about",
    })

    const response = context.redirect("/contact", {
      status: 303,
      headers: { "X-Custom": "header" },
    })
    expect(response.status).toBe(303)
    expect(response.headers.get("Location")).toBe("/en/contact")
    expect(response.headers.get("X-Custom")).toBe("header")
  })

  it("throws error when target url does not start with /", () => {
    const context = createRequestContext({
      locale: "en",
      i18n: i18n,
      url: new URL("http://localhost/en/about"),
      requestLocale: "en",
      requestPathname: "/about",
    })

    expect(() => context.redirect("contact")).toThrow(
      "target path must start with a '/': 'contact'",
    )
  })

  it("handles locale with country code", () => {
    const context = createRequestContext({
      locale: "en-us",
      i18n: i18n,
      url: new URL("http://localhost/en-us/about"),
      requestLocale: "en-us",
      requestPathname: "/about",
    })

    const response = context.redirect("/contact")
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/en-us/contact")
  })

  it("preserves query parameters in target url", () => {
    const context = createRequestContext({
      locale: "fr",
      i18n: i18n,
      url: new URL("http://localhost/fr/about"),
      requestLocale: "fr",
      requestPathname: "/about",
    })

    const response = context.redirect("/contact?foo=bar")
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/fr/contact?foo=bar")
  })

  it("preserves hash in target url", () => {
    const context = createRequestContext({
      locale: "en",
      i18n: i18n,
      url: new URL("http://localhost/en/about"),
      requestLocale: "en",
      requestPathname: "/about",
    })

    const response = context.redirect("/contact#section")
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/en/contact#section")
  })

  it("should preserve all context properties when using redirect", () => {
    const mockUrl = new URL("http://localhost/en/about")

    const context = createRequestContext({
      locale: "en",
      i18n: i18n,
      url: mockUrl,
      requestLocale: "en",
      requestPathname: "/about",
    })

    context.redirect("/contact")

    // Verify context has all expected properties
    expect(context.locale).toBe("en")
    expect(context.requestLocale).toBe("en")
    expect(context.requestPathname).toBe("/about")
    expect(context.url).toBe(mockUrl)
  })
})

describe("context properties", () => {
  it("includes all required properties", () => {
    const mockUrl = new URL("http://localhost/en/about")

    const context = createRequestContext({
      locale: "en",
      i18n: i18n,
      url: mockUrl,
      requestLocale: "en",
      requestPathname: "/about",
    })

    expect(context.locale).toBe("en")
    expect(context.i18n).toBe(i18n)
    expect(context.url).toBe(mockUrl)
    expect(context.requestLocale).toBe("en")
    expect(context.requestPathname).toBe("/about")
    expect(typeof context._).toBe("function")
    expect(typeof context.redirect).toBe("function")
    expect(typeof context.changeLocale).toBe("function")
  })
})
