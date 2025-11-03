import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import StaticHello from "./static-hello"
import { createRoutesStub } from "react-router"

describe("/static-hello", () => {
  it("navigates to /static-hello and shows static content", async () => {
    const url = "/static-hello"
    const Stub = createRoutesStub([{
      path: "static-hello",
      Component: StaticHello,
    }])
    render(<Stub initialEntries={[url]} />)
    // Static heading
    await expect(screen.findByRole("heading", { name: /Static Page/i })).resolves.toBeTruthy()
    // Static description
    await expect(screen.findByText(/This is a static page without localization\./i)).resolves.toBeTruthy()
  })
})
