import { i18n } from "@lingui/core"
import { describe, expect, it } from "vitest"
import { createRequestContext } from "./context"

describe("createRequestContext", () => {
  describe("redirect function", () => {
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
    })
  })
})

