import { i18n } from "@lingui/core"
import { useLingui } from "@lingui/react"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
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
      })

      const url = "/test"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      await waitFor(() => {
        const localeElement = screen.getByTestId("current-locale")
        expect(localeElement.textContent).toBe("en")
      })
    })
  })

  describe("locale change handling via navigation", () => {
    it("activates new locale when navigating to a different locale", async () => {
      const user = userEvent.setup()

      const Stub = createLocaleRouteStub({
        path: "test",
        Component: LocaleDisplayWithLinks,
      })

      const url = "/en/test"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

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
  })

  describe("locale switching between different locales", () => {
    it("switches between multiple locales correctly via navigation", async () => {
      const Stub = createLocaleRouteStub({
        path: "test",
        Component: LocaleDisplayWithLinks,
      })

      const url = "/en/test"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

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
        console.log("localeElement.textContent:", localeElement.textContent)
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
      console.log("waiting for default")
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
      })

      const url = "/it/test"
      await loadInitialLocale(url)
      render(<Stub initialEntries={[url]} />)

      await waitFor(() => {
        const i18nAvailable = screen.getByTestId("i18n-available")
        const i18nLocale = screen.getByTestId("i18n-locale")

        expect(i18nAvailable.textContent).toBe("available")
        expect(i18nLocale.textContent).toBe("it")
      })
    })
  })
})
