import { render, screen } from "@testing-library/react"
import { createLocaleRouteStub } from "lingui-react-router/test"
import { describe, expect, it } from "vitest"
import Hello, { loader as helloLoader } from "./hello"

describe("/:locale?/hello", () => {
  const Stub = createLocaleRouteStub({
    path: "hello",
    Component: Hello,
    loader: helloLoader,
  })

  it("navigates to /hello and shows Hello and loader text", async () => {
    const url = "/hello"
    render(<Stub initialEntries={[url]} />)

    // Hello heading - use findByText to wait for async rendering
    await expect(screen.findByText(/Hello, World!/i)).resolves.toBeTruthy()

    // Loader returns: 'From loader too!'
    await expect(screen.findByText(/From loader too!/i)).resolves.toBeTruthy()

    // Special chars and variable-translated text should render
    await expect(screen.findByText(/Special chars:/i)).resolves.toBeTruthy()
    await expect(screen.findByText(/Gray-colored text with a variable/i)).resolves.toBeTruthy()
  })

  it("should render localized content when navigating to /it/hello", async () => {
    const url = "/it/hello"
    render(<Stub initialEntries={[url]} />)

    // Italian heading
    await expect(screen.findByText(/Ciao, mondo!/i)).resolves.toBeTruthy()

    // Loader returns: 'From loader too!'
    await expect(screen.findByText(/Anche dal loader!/i)).resolves.toBeTruthy()

    // Special chars and variable-translated text should render
    await expect(screen.findByText("Caratteri speciali: \"'$.*+@!")).resolves.toBeTruthy()
    await expect(screen.findByText(/Testo di colore grigio con una variabile:/)).resolves.toBeTruthy()
  })

  it("should redirect from mapped locale /de/hello to configured mapped locale /cs/hello", async () => {
    const url = "/de/hello"
    render(<Stub initialEntries={[url]} />)

    // Redirected to /cs/hello (configured mapping de -> cs)
    await expect(screen.findByText(/Ahoj světe!/i)).resolves.toBeTruthy()
    await expect(screen.findByText(/Také z loaderu!/i)).resolves.toBeTruthy()
  })

  it("should fail on unknown locale /xx/hello", async () => {
    const url = "/xx/hello"
    render(<Stub initialEntries={[url]} />)

    // Should return 404
    await expect(screen.findByText(/404 Locale Not Found/i)).resolves.toBeTruthy()
  })
})
