import { i18n } from "@lingui/core"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as i18nModule from "../i18n"
import * as runtimeModule from "../runtime"
import { loadInitialLocale } from "./client-init"

vi.mock("@lingui/core", () => ({
  i18n: {
    loadAndActivate: vi.fn(),
  },
}))

vi.mock("../i18n", () => ({
  findLocale: vi.fn(),
}))

vi.mock("../runtime", () => ({
  defaultLocale: "en",
  loadLocaleCatalog: vi.fn(),
}))

vi.mock("./assert-client", () => ({}))

describe("loadInitialLocale", () => {
  const mockMessages = { hello: "Hello" }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should extract first pathname segment and pass to findLocale", async () => {
    vi.mocked(i18nModule.findLocale).mockReturnValue({
      locale: "fr",
      excluded: false,
    })
    vi.mocked(runtimeModule.loadLocaleCatalog).mockResolvedValue(mockMessages)

    await loadInitialLocale("/fr/about")

    // Verify that 'fr' was extracted from '/fr/about'
    expect(i18nModule.findLocale).toHaveBeenCalledWith("fr")
    expect(runtimeModule.loadLocaleCatalog).toHaveBeenCalledWith("fr")
    expect(i18n.loadAndActivate).toHaveBeenCalledWith({
      locale: "fr",
      messages: mockMessages,
    })
  })

  it("should use default locale when pathname is root", async () => {
    vi.mocked(runtimeModule.loadLocaleCatalog).mockResolvedValue(mockMessages)

    await loadInitialLocale("/")

    expect(i18nModule.findLocale).not.toHaveBeenCalled()
    expect(runtimeModule.loadLocaleCatalog).toHaveBeenCalledWith("en")
    expect(i18n.loadAndActivate).toHaveBeenCalledWith({
      locale: "en",
      messages: mockMessages,
    })
  })

  it("should use default locale when findLocale returns undefined", async () => {
    vi.mocked(i18nModule.findLocale).mockReturnValue({
      locale: undefined,
      excluded: false,
    })
    vi.mocked(runtimeModule.loadLocaleCatalog).mockResolvedValue(mockMessages)

    await loadInitialLocale("/about")

    // Verify that 'about' was extracted and passed to findLocale
    expect(i18nModule.findLocale).toHaveBeenCalledWith("about")
    expect(runtimeModule.loadLocaleCatalog).toHaveBeenCalledWith("en")
    expect(i18n.loadAndActivate).toHaveBeenCalledWith({
      locale: "en",
      messages: mockMessages,
    })
  })

  it("should extract locale from pathname with trailing slash", async () => {
    vi.mocked(i18nModule.findLocale).mockReturnValue({
      locale: "es",
      excluded: false,
    })
    vi.mocked(runtimeModule.loadLocaleCatalog).mockResolvedValue(mockMessages)

    await loadInitialLocale("/es/contact/")

    // Verify that 'es' was extracted from '/es/contact/'
    expect(i18nModule.findLocale).toHaveBeenCalledWith("es")
    expect(runtimeModule.loadLocaleCatalog).toHaveBeenCalledWith("es")
    expect(i18n.loadAndActivate).toHaveBeenCalledWith({
      locale: "es",
      messages: mockMessages,
    })
  })

  it("should extract locale from pathname with multiple segments", async () => {
    vi.mocked(i18nModule.findLocale).mockReturnValue({
      locale: "it",
      excluded: false,
    })
    vi.mocked(runtimeModule.loadLocaleCatalog).mockResolvedValue(mockMessages)

    await loadInitialLocale("/it/products/categories/electronics")

    // Verify that only 'it' (first segment) was extracted
    expect(i18nModule.findLocale).toHaveBeenCalledWith("it")
    expect(runtimeModule.loadLocaleCatalog).toHaveBeenCalledWith("it")
    expect(i18n.loadAndActivate).toHaveBeenCalledWith({
      locale: "it",
      messages: mockMessages,
    })
  })

  it("should handle pathname with multiple leading slashes", async () => {
    vi.mocked(i18nModule.findLocale).mockReturnValue({
      locale: "de",
      excluded: false,
    })
    vi.mocked(runtimeModule.loadLocaleCatalog).mockResolvedValue(mockMessages)

    await loadInitialLocale("///de/page")

    // Verify that 'de' was extracted despite multiple leading slashes
    expect(i18nModule.findLocale).toHaveBeenCalledWith("de")
    expect(runtimeModule.loadLocaleCatalog).toHaveBeenCalledWith("de")
    expect(i18n.loadAndActivate).toHaveBeenCalledWith({
      locale: "de",
      messages: mockMessages,
    })
  })

  it("should extract locale from locale-only pathname", async () => {
    vi.mocked(i18nModule.findLocale).mockReturnValue({
      locale: "pt",
      excluded: false,
    })
    vi.mocked(runtimeModule.loadLocaleCatalog).mockResolvedValue(mockMessages)

    await loadInitialLocale("/pt")

    // Verify that 'pt' was extracted from '/pt'
    expect(i18nModule.findLocale).toHaveBeenCalledWith("pt")
    expect(runtimeModule.loadLocaleCatalog).toHaveBeenCalledWith("pt")
    expect(i18n.loadAndActivate).toHaveBeenCalledWith({
      locale: "pt",
      messages: mockMessages,
    })
  })

  it("should fallback to default locale when pathname does not match regex pattern", async () => {
    vi.mocked(runtimeModule.loadLocaleCatalog).mockResolvedValue(mockMessages)

    await loadInitialLocale("no-leading-slash")

    // Pathname doesn't start with '/', regex won't match, no locale extracted
    expect(i18nModule.findLocale).not.toHaveBeenCalled()
    expect(runtimeModule.loadLocaleCatalog).toHaveBeenCalledWith("en")
    expect(i18n.loadAndActivate).toHaveBeenCalledWith({
      locale: "en",
      messages: mockMessages,
    })
  })

  it("should extract first segment containing special characters", async () => {
    vi.mocked(i18nModule.findLocale).mockReturnValue({
      locale: undefined,
      excluded: false,
    })
    vi.mocked(runtimeModule.loadLocaleCatalog).mockResolvedValue(mockMessages)

    await loadInitialLocale("/en-US/page")

    // Verify that 'en-US' was extracted and passed to findLocale
    expect(i18nModule.findLocale).toHaveBeenCalledWith("en-US")
    expect(runtimeModule.loadLocaleCatalog).toHaveBeenCalledWith("en")
  })

  it("should handle empty first segment", async () => {
    vi.mocked(i18nModule.findLocale).mockReturnValue({
      locale: undefined,
      excluded: false,
    })
    vi.mocked(runtimeModule.loadLocaleCatalog).mockResolvedValue(mockMessages)

    await loadInitialLocale("//page")

    // Multiple slashes are normalized, 'page' is extracted as first segment
    expect(i18nModule.findLocale).toHaveBeenCalledWith("page")
    expect(runtimeModule.loadLocaleCatalog).toHaveBeenCalledWith("en")
  })
})
