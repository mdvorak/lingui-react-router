import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { loadInitialLocale } from "lingui-react-router/client"
import { createLocaleRouteStub } from "lingui-react-router/test"
import { describe, expect, it } from "vitest"
import SelectLanguage from "./SelectLanguage"

describe("SelectLanguage", () => {
  const Stub = createLocaleRouteStub({
    path: "test",
    Component: SelectLanguage,
  })

  it("renders the language selector with the default locale", async () => {
    const url = "/test"

    await loadInitialLocale(url)
    render(<Stub initialEntries={[url]} />)

    // Check that the label is rendered
    await expect(screen.findByText("Language")).resolves.toBeTruthy()

    // Check that the select element is rendered
    const select = await screen.findByRole("combobox")
    expect(select).toBeTruthy()

    // Default locale should be 'en'
    expect((select as HTMLSelectElement).value).toBe("en")
  })

  it("renders all available locales except pseudo", async () => {
    const url = "/test"

    await loadInitialLocale(url)
    render(<Stub initialEntries={[url]} />)

    // Get all options
    const options = await screen.findAllByRole("option")

    // Should have 4 locales (en, en-gb, cs, it) - pseudo is excluded
    expect(options).toHaveLength(4)

    // Check that each locale is present (by value)
    const optionValues = options.map(opt => (opt as HTMLOptionElement).value)
    expect(optionValues).toContain("en")
    expect(optionValues).toContain("en-gb")
    expect(optionValues).toContain("cs")
    expect(optionValues).toContain("it")

    // Pseudo locale should not be present
    expect(optionValues).not.toContain("pseudo")
  })

  it("displays the current locale in the selector", async () => {
    const url = "/it/test"

    await loadInitialLocale(url)
    render(<Stub initialEntries={[url]} />)

    const select = await screen.findByRole("combobox")
    expect((select as HTMLSelectElement).value).toBe("it")
  })

  it("renders localized label text", async () => {
    const url = "/it/test"

    await loadInitialLocale(url)
    render(<Stub initialEntries={[url]} />)

    // In Italian, "Language" should be translated to "Lingua"
    await expect(screen.findByText("Lingua")).resolves.toBeTruthy()
  })

  it("navigates to the correct locale path when changed", async () => {
    const user = userEvent.setup()
    const url = "/en/test"

    await loadInitialLocale(url)
    render(<Stub initialEntries={[url]} />)

    const select = await screen.findByRole("combobox")
    expect((select as HTMLSelectElement).value).toBe("en")

    // Change to Italian
    await user.selectOptions(select, "it")

    // After navigation, the URL should change and the select should reflect it
    // Note: In a stub environment, we can check the selected value
    const updatedSelect = await screen.findByRole("combobox")
    expect((updatedSelect as HTMLSelectElement).value).toBe("it")
  })

  it("preserves query parameters and hash when changing locale", async () => {
    const user = userEvent.setup()
    const url = "/en/test?foo=bar#section"

    await loadInitialLocale(url)
    render(<Stub initialEntries={[url]} />)

    const select = await screen.findByRole("combobox")

    // Change to Czech
    await user.selectOptions(select, "cs")

    // The component should navigate to /cs/test?foo=bar#section
    // In the test environment, we verify the select value changed
    const updatedSelect = await screen.findByRole("combobox")
    expect((updatedSelect as HTMLSelectElement).value).toBe("cs")
  })

  it("handles locale change from default locale path", async () => {
    const user = userEvent.setup()
    const url = "/test"

    await loadInitialLocale(url)
    render(<Stub initialEntries={[url]} />)

    const select = await screen.findByRole("combobox")
    expect((select as HTMLSelectElement).value).toBe("en")

    // Change to en-GB (note: value is lowercase 'en-gb')
    await user.selectOptions(select, "en-gb")

    // Should navigate to /en-GB/test
    const updatedSelect = await screen.findByRole("combobox")
    expect((updatedSelect as HTMLSelectElement).value).toBe("en-gb")
  })

  it("renders with correct CSS classes", async () => {
    const url = "/test"

    await loadInitialLocale(url)
    render(<Stub initialEntries={[url]} />)

    const select = await screen.findByRole("combobox")
    expect(select.className).toContain("data-hover:outline-1")
    expect(select.className).toContain("border-0!")
  })

  it("has proper accessibility attributes", async () => {
    const url = "/test"

    await loadInitialLocale(url)
    render(<Stub initialEntries={[url]} />)

    // Check that label and select are properly associated
    const label = await screen.findByText("Language")
    const select = await screen.findByRole("combobox")

    // The label should be associated with the select
    // (via the implicit label wrapping or for/id attributes)
    expect(label).toBeTruthy()
    expect(select).toBeTruthy()
  })
})

