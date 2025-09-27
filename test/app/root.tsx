import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"

import { msg } from "@lingui/core/macro"
import { I18nProvider } from "@lingui/react"
import { useLingui } from "@lingui/react/macro"
import { initLingui } from "lingui-react-router"
import { createLocaleMiddleware } from "lingui-react-router/server"
import { type ReactNode } from "react"
import i18nConfig from "../i18n.config"
import type { Route } from "./+types/root"
import "./app.css"

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
]

export const middleware: Route.MiddlewareFunction[] = [createLocaleMiddleware(i18nConfig)]

export function Layout({ children }: { children: ReactNode }) {
  const i18n = initLingui()

  return (
    <html lang={i18n.locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{i18n._(msg`Lingui React Router App`)}</title>
        <Meta />
        <Links />
      </head>
      <body>
        <I18nProvider i18n={i18n}>{children}</I18nProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useLingui()

  let message = t`"Oops!`
  let details = t`An unexpected error occurred.`
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error"
    details = error.status === 404 ? t`The requested page could not be found.` : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
