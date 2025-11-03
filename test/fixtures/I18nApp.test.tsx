import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { createLocaleRouteStub } from "lingui-react-router/test"
import { afterEach, describe, expect, it } from "vitest"
import { useLingui } from "@lingui/react"
import { Link } from "react-router"

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
  })

  describe("locale initialization", () => {
    it("initializes with default locale when no locale in path", async () => {
      const Stub = createLocaleRouteStub({
        path: "test",
        Component: LocaleDisplay,
      })

      render(<Stub initialEntries={["/test"]} />)

      const localeElement = await screen.findByTestId("current-locale")
      expect(localeElement.textContent).toBe("en")
    })
  })

  describe("locale change handling via navigation", () => {
    it("activates new locale when navigating to a different locale", async () => {
      const user = userEvent.setup()

      const Stub = createLocaleRouteStub({
        path: "test",
        Component: LocaleDisplayWithLinks,
      })

      render(<Stub initialEntries={["/en/test"]} />)

      // Verify initial locale
      let localeElement = await screen.findByTestId("current-locale")
      expect(localeElement.textContent).toBe("en")

      // Navigate to Italian locale by clicking link
      const itLink = screen.getByTestId("link-it")
      await user.click(itLink)

      // Wait for locale to change
      await waitFor(() => {
        localeElement = screen.getByTestId("current-locale")
        expect(localeElement.textContent).toBe("it")
      })
    })
  })

  describe("locale switching between different locales", () => {
    it("switches between multiple locales correctly via navigation", async () => {
      const user = userEvent.setup()

      const Stub = createLocaleRouteStub({
        path: "test",
        Component: LocaleDisplayWithLinks,
      })

      render(<Stub initialEntries={["/en/test"]} />)

      // Start with English
      let localeElement = await screen.findByTestId("current-locale")
      expect(localeElement.textContent).toBe("en")

      // Switch to Italian
      const itLink = screen.getByTestId("link-it")
      await user.click(itLink)
      await waitFor(() => {
        localeElement = screen.getByTestId("current-locale")
        expect(localeElement.textContent).toBe("it")
      })

      // Switch to Czech
      const csLink = screen.getByTestId("link-cs")
      await user.click(csLink)
      await waitFor(() => {
        localeElement = screen.getByTestId("current-locale")
        expect(localeElement.textContent).toBe("cs")
      })

      // Switch to British English
      const enGbLink = screen.getByTestId("link-en-GB")
      await user.click(enGbLink)
      await waitFor(() => {
        localeElement = screen.getByTestId("current-locale")
        // Locale keys are normalized to lowercase
        expect(localeElement.textContent).toBe("en-gb")
      })

      // Switch back to default
      const defaultLink = screen.getByTestId("link-default")
      await user.click(defaultLink)
      await waitFor(() => {
        localeElement = screen.getByTestId("current-locale")
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

      render(<Stub initialEntries={["/it/test"]} />)

      const i18nAvailable = await screen.findByTestId("i18n-available")
      expect(i18nAvailable.textContent).toBe("available")

      const i18nLocale = await screen.findByTestId("i18n-locale")
      expect(i18nLocale.textContent).toBe("it")
    })
  })
})
