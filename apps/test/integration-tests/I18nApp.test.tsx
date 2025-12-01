import { i18n } from "@lingui/core"
import { useLingui } from "@lingui/react"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useRouteLocale } from "lingui-react-router"
import { loadInitialLocale } from "lingui-react-router/client"
import { createLocaleRouteStub } from "lingui-react-router/test"
import { Link } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

// Component that displays the current locale and a test message
function LocaleDisplay() {
  const { i18n } = useLingui()
  return (
    <div>
      <div data-testid="current-locale">{i18n.locale}</div>
      <div data-testid="has-messages">{Object.keys(i18n.messages).length > 0 ? "yes" : "no"}</div>
    </div>
  )
}

// Component that displays RouteLocale context values
function RouteLocaleDisplay() {
  const { i18n } = useLingui()
  const routeLocale = useRouteLocale()
  return (
    <div>
      <div data-testid="current-locale">{i18n.locale}</div>
      <div data-testid="locale-route">{routeLocale.locale}</div>
      <div data-testid="path-request-locale">{routeLocale.requestLocale ?? "undefined"}</div>
      <div data-testid="path-request-pathname">{routeLocale.requestPathname}</div>
    </div>
  )
}

// Component with navigation links to test locale switching
function LocaleDisplayWithLinks() {
  const { i18n } = useLingui()
  return (
    <div>
      <div data-testid="current-locale">{i18n.locale}</div>
      <div data-testid="has-messages">{Object.keys(i18n.messages).length > 0 ? "yes" : "no"}</div>
      <nav>
        <Link to="/en/test" data-testid="link-en">English</Link>
        <Link to="/it/test" data-testid="link-it">Italian</Link>
        <Link to="/cs/test" data-testid="link-cs">Czech</Link>
        <Link to="/en-GB/test" data-testid="link-en-GB">British English</Link>
        <Link to="/test" data-testid="link-default">Default</Link>
      </nav>
    </div>
  )
}

function TestErrorBoundary({ error }: { error: any }) {
  return (<span data-testid="error">{error?.message}</span>)
}

function assertErrorBoundary() {
  expect(screen.queryByTestId("error")).toBeNull()
}

describe("I18nApp", () => {
  afterEach(() => {
    cleanup()
    i18n.loadAndActivate({ locale: "", messages: {} })
  })

  describe("locale initialization", () => {
    it("initializes with default locale when no locale in path", async () => {
      const Stub = createLocaleRouteStub({
        path: "test",
        Component: LocaleDisplay,
        ErrorBoundary: TestErrorBoundary,
      })

      const url = "/test"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)
      assertErrorBoundary()

      await waitFor(() => {
        const localeElement = screen.getByTestId("current-locale")
        expect(localeElement.textContent).toBe("en")
      })
    })
  })

  describe("locale change handling via navigation", () => {
    const Stub = createLocaleRouteStub({
      path: "test",
      Component: LocaleDisplayWithLinks,
      ErrorBoundary: TestErrorBoundary,
    })

    it("activates new locale when navigating to a different locale", async () => {
      const user = userEvent.setup()

      const url = "/en/test"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)
      assertErrorBoundary()

      // Verify initial locale
      await waitFor(() => {
        const localeElement = screen.getByTestId("current-locale")
        expect(localeElement.textContent).toBe("en")
      })

      // Navigate to Italian locale by clicking link
      const itLink = screen.getByTestId("link-it")
      await user.click(itLink)

      // Wait for locale to change
      await waitFor(() => {
        const localeElement = screen.getByTestId("current-locale")
        expect(localeElement.textContent).toBe("it")
      })
    })

    it("switches between multiple locales correctly via navigation", async () => {
      const url = "/en/test"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)
      assertErrorBoundary()

      // Start with English
      await waitFor(() => {
        const localeElement = screen.getByTestId("current-locale")
        expect(localeElement.textContent).toBe("en")
      })

      // Switch to Italian
      const itLink = screen.getByTestId("link-it")
      await userEvent.setup().click(itLink)
      await waitFor(() => {
        const localeElement = screen.getByTestId("current-locale")
        expect(localeElement.textContent).toBe("it")
      })

      // Switch to Czech
      const csLink = screen.getByTestId("link-cs")
      await userEvent.setup().click(csLink)
      await waitFor(() => {
        const localeElement = screen.getByTestId("current-locale")
        expect(localeElement.textContent).toBe("cs")
      })

      // Switch to British English
      const enGbLink = screen.getByTestId("link-en-GB")
      await userEvent.setup().click(enGbLink)
      await waitFor(() => {
        const localeElement = screen.getByTestId("current-locale")
        // Locale keys are normalized in the process
        expect(localeElement.textContent).toBe("en-gb")
      })

      // Switch back to default
      const defaultLink = screen.getByTestId("link-default")
      await userEvent.setup().click(defaultLink)
      await waitFor(() => {
        const localeElement = screen.getByTestId("current-locale")
        expect(localeElement.textContent).toBe("en")
      })
    })
  })

  describe("integration with I18nProvider", () => {
    it("provides working i18n instance to useLingui hook", async () => {
      const TestComponent = () => {
        const { i18n } = useLingui()
        return (
          <div>
            <div data-testid="i18n-locale">{i18n?.locale}</div>
            <div data-testid="i18n-available">{i18n ? "available" : "not available"}</div>
          </div>
        )
      }

      const Stub = createLocaleRouteStub({
        path: "test",
        Component: TestComponent,
        ErrorBoundary: TestErrorBoundary,
      })

      const url = "/it/test"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)
      assertErrorBoundary()

      await waitFor(() => {
        const i18nAvailable = screen.getByTestId("i18n-available")
        const i18nLocale = screen.getByTestId("i18n-locale")

        expect(i18nAvailable.textContent).toBe("available")
        expect(i18nLocale.textContent).toBe("it")
      })
    })
  })

  describe("LocalePathContext with useRouteLocale", () => {
    const Stub = createLocaleRouteStub({
      path: "test",
      Component: RouteLocaleDisplay,
      ErrorBoundary: TestErrorBoundary,
    })

    it("provides correct context when locale is in URL path", async () => {
      const url = "/it/test"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)
      assertErrorBoundary()

      await waitFor(() => {
        const routeLocale = screen.getByTestId("locale-route")
        const pathRequestLocale = screen.getByTestId("path-request-locale")
        const pathRequestPathname = screen.getByTestId("path-request-pathname")

        expect(routeLocale.textContent).toBe("it")
        expect(pathRequestLocale.textContent).toBe("it")
        expect(pathRequestPathname.textContent).toBe("/test")
      })
    })

    it("provides correct context when using default locale without locale in URL", async () => {
      const url = "/test"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)
      assertErrorBoundary()

      await waitFor(() => {
        const routeLocale = screen.getByTestId("locale-route")
        const pathRequestLocale = screen.getByTestId("path-request-locale")
        const pathRequestPathname = screen.getByTestId("path-request-pathname")

        expect(routeLocale.textContent).toBe("en") // default locale
        expect(pathRequestLocale.textContent).toBe("undefined") // no locale in URL
        expect(pathRequestPathname.textContent).toBe("/test")
      })
    })

    it("updates context when navigating between locales", async () => {
      const RouteLocaleDisplayWithLinks = () => {
        const { i18n } = useLingui()
        const routeLocale = useRouteLocale()
        return (
          <div>
            <div data-testid="current-locale">{i18n.locale}</div>
            <div data-testid="locale-route">{routeLocale.locale}</div>
            <div data-testid="path-request-locale">{routeLocale.requestLocale ?? "undefined"}</div>
            <div data-testid="path-request-pathname">{routeLocale.requestPathname}</div>
            <nav>
              <Link to="/en/about" data-testid="link-en">English</Link>
              <Link to="/cs/about" data-testid="link-cs">Czech</Link>
            </nav>
          </div>
        )
      }

      const Stub = createLocaleRouteStub({
        path: "about",
        Component: RouteLocaleDisplayWithLinks,
        ErrorBoundary: TestErrorBoundary,
      })

      const url = "/en/about"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)
      assertErrorBoundary()

      // Verify initial state
      await waitFor(() => {
        expect(screen.getByTestId("locale-route").textContent).toBe("en")
        expect(screen.getByTestId("path-request-locale").textContent).toBe("en")
        expect(screen.getByTestId("path-request-pathname").textContent).toBe("/about")
      })

      // Navigate to Czech
      const csLink = screen.getByTestId("link-cs")
      await userEvent.setup().click(csLink)

      // Verify updated state
      await waitFor(() => {
        expect(screen.getByTestId("locale-route").textContent).toBe("cs")
        expect(screen.getByTestId("path-request-locale").textContent).toBe("cs")
        expect(screen.getByTestId("path-request-pathname").textContent).toBe("/about")
      })
    })

    it("strips locale prefix from requestPathname correctly", async () => {
      const Stub = createLocaleRouteStub({
        path: "nested/deep/path",
        Component: RouteLocaleDisplay,
        ErrorBoundary: TestErrorBoundary,
      })

      const url = "/en-GB/nested/deep/path"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)
      assertErrorBoundary()

      await waitFor(() => {
        const routeLocale = screen.getByTestId("locale-route")
        const pathRequestLocale = screen.getByTestId("path-request-locale")
        const pathRequestPathname = screen.getByTestId("path-request-pathname")

        expect(routeLocale.textContent).toBe("en-gb") // normalized
        expect(pathRequestLocale.textContent).toBe("en-gb")
        expect(pathRequestPathname.textContent).toBe("/nested/deep/path")
      })
    })

    it("handles query parameters and hash in pathname", async () => {
      const RouteLocaleDisplayWithQuery = () => {
        const routeLocale = useRouteLocale()
        return (
          <div>
            <div data-testid="locale-route">{routeLocale.locale}</div>
            <div data-testid="path-request-locale">{routeLocale.requestLocale ?? "undefined"}</div>
            <div data-testid="path-request-pathname">{routeLocale.requestPathname}</div>
            <Link to="/it/page?foo=bar#section" data-testid="link-with-query">Link with query</Link>
          </div>
        )
      }

      const Stub = createLocaleRouteStub({
        path: "page",
        Component: RouteLocaleDisplayWithQuery,
        ErrorBoundary: TestErrorBoundary,
      })

      const url = "/en/page"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)
      assertErrorBoundary()

      // Navigate to link with query and hash
      const link = screen.getByTestId("link-with-query")
      await userEvent.setup().click(link)

      await waitFor(() => {
        const pathRequestPathname = screen.getByTestId("path-request-pathname")
        // Query and hash should not be part of requestPathname
        expect(pathRequestPathname.textContent).toBe("/page")
      })
    })
  })
})
