import { render, screen } from "@testing-library/react"
import { localeMiddleware } from "lingui-react-router/server"
import { createRoutesStub } from "react-router"
import { describe, expect, it } from "vitest"
import StaticHello, { loader } from "./static-hello"

describe("/static-hello", () => {
  it("navigates to /static-hello and shows static content", async () => {
    const url = "/static-hello"
    const Stub = createRoutesStub([{
      path: "static-hello",
      Component: StaticHello,
      loader: loader,
      middleware: [localeMiddleware],
      HydrateFallback: () => "Hydration failed",
    }])
    render(<Stub initialEntries={[url]} future={{ v8_middleware: true }} />)
    // Static heading
    await expect(screen.findByRole("heading", { name: /Static Page/i })).resolves.toBeTruthy()
    // Static description
    await expect(screen.findByText(/This is a static page without localization\./i)).resolves.toBeTruthy()
    // Loader text
    await expect(screen.findByText(/Tsssss.../i)).resolves.toBeTruthy()
  })
})
