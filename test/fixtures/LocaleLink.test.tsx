import { render, screen, waitFor } from "@testing-library/react"
import { LocaleLink } from "lingui-react-router"
import { loadInitialLocale } from "lingui-react-router/client"
import { createLocaleRouteStub } from "lingui-react-router/test"
import { describe, expect, it } from "vitest"

describe("LocaleLink", () => {
  describe("with string 'to' prop", () => {
    function createLocaleLinkStub(to = "/hello") {
      const TestComponent = () => (
        <div>
          <LocaleLink to={to}>Test Link</LocaleLink>
        </div>
      )

      return createLocaleRouteStub({
        path: "test",
        Component: TestComponent,
      })
    }

    it("renders a link without locale prefix when no locale is in the path", async () => {
      const Stub = createLocaleLinkStub()

      const url = "/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/hello")
      })
    })

    it("prefixes the link with the current locale when locale is in the path", async () => {
      const Stub = createLocaleLinkStub()

      const url = "/en/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/en/hello")
      })
    })

    it("handles different locales correctly", async () => {
      const Stub = createLocaleLinkStub()

      const url = "/it/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/it/hello")
      })
    })

    it("handles locale with country code", async () => {
      const Stub = createLocaleLinkStub()

      const url = "/en-gb/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/en-gb/hello")
      })
    })

    it("handles root path correctly", async () => {
      const Stub = createLocaleLinkStub("/")

      const url = "/en/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/en/")
      })
    })

    it("handles paths with existing leading slash", async () => {
      const Stub = createLocaleLinkStub("/path/to/page")

      const url = "/cs/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/cs/path/to/page")
      })
    })
  })

  describe("with object 'to' prop", () => {
    it("renders a link without locale prefix when no locale is in the path", async () => {
      const TestComponent = () => (
        <div>
          <LocaleLink to={{ pathname: "/hello" }}>Test Link</LocaleLink>
        </div>
      )

      const Stub = createLocaleRouteStub({
        path: "test",
        Component: TestComponent,
      })

      const url = "/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/hello")
      })
    })

    it("prefixes the pathname with the current locale when locale is in the path", async () => {
      const TestComponent = () => (
        <div>
          <LocaleLink to={{ pathname: "/hello" }}>Test Link</LocaleLink>
        </div>
      )

      const Stub = createLocaleRouteStub({
        path: "test",
        Component: TestComponent,
      })

      const url = "/en/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/en/hello")
      })
    })

    it("preserves search params when locale is present", async () => {
      const TestComponent = () => (
        <div>
          <LocaleLink to={{ pathname: "/hello", search: "?foo=bar" }}>Test Link</LocaleLink>
        </div>
      )

      const Stub = createLocaleRouteStub({
        path: "test",
        Component: TestComponent,
      })

      const url = "/en/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/en/hello?foo=bar")
      })
    })

    it("preserves hash when locale is present", async () => {
      const TestComponent = () => (
        <div>
          <LocaleLink to={{ pathname: "/hello", hash: "#section" }}>Test Link</LocaleLink>
        </div>
      )

      const Stub = createLocaleRouteStub({
        path: "test",
        Component: TestComponent,
      })

      const url = "/en/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/en/hello#section")
      })
    })

    it("preserves both search and hash when locale is present", async () => {
      const TestComponent = () => (
        <div>
          <LocaleLink to={{ pathname: "/hello", search: "?foo=bar", hash: "#section" }}>
            Test Link
          </LocaleLink>
        </div>
      )

      const Stub = createLocaleRouteStub({
        path: "test",
        Component: TestComponent,
      })


      const url = "/it/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/it/hello?foo=bar#section")
      })
    })

    it("handles object with different locale in path", async () => {
      const TestComponent = () => (
        <div>
          <LocaleLink to={{ pathname: "/about" }}>Test Link</LocaleLink>
        </div>
      )

      const Stub = createLocaleRouteStub({
        path: "test",
        Component: TestComponent,
      })

      const url = "/cs/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/cs/about")
      })
    })
  })

  describe("edge cases", () => {
    it("handles empty pathname correctly", async () => {
      const TestComponent = () => (
        <div>
          <LocaleLink to="">Test Link</LocaleLink>
        </div>
      )

      const Stub = createLocaleRouteStub({
        path: "test",
        Component: TestComponent,
      })

      const url = "/en/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/en")
      })
    })

    it("handles object with empty pathname", async () => {
      const TestComponent = () => (
        <div>
          <LocaleLink to={{ pathname: "" }}>Test Link</LocaleLink>
        </div>
      )

      const Stub = createLocaleRouteStub({
        path: "test",
        Component: TestComponent,
      })

      const url = "/en/test"

      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      const link = await screen.findByRole("link", { name: "Test Link" })
      expect(link).toBeTruthy()

      await waitFor(() => {
        expect(link.getAttribute("href")).toBe("/en")
      })
    })
  })
})
