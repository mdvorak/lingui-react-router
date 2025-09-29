import { useLingui } from "@lingui/react/macro"
import { I18nApp } from "lingui-react-router"
import { createLocaleMiddleware } from "lingui-react-router/server"
import { type ReactNode } from "react"
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"
import SelectLanguage from "~/components/SelectLanguage"
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

export function meta({}: Route.MetaArgs) {
  const { t } = useLingui()
  return [
    { title: t`Lingui React Router App` },
    { name: "description", content: t`Lingui React Router integration example` },
  ]
}

function RootLayout({ children }: { children: ReactNode }) {
  const { i18n } = useLingui()

  return (
    <html lang={i18n.locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="w-full">
          <SelectLanguage />
        </div>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <I18nApp config={i18nConfig}>
      <RootLayout>{children}</RootLayout>
    </I18nApp>
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
    details =
      error.status === 404 ? t`The requested page could not be found.` : error.statusText || details
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
