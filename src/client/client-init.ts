import { i18n } from "@lingui/core"
import { findPathLocale } from "../i18n"
import { defaultLocale, loadLocaleCatalog } from "../runtime"
import "./assert-client"

/**
 * Setup lingui for client-side rendering.
 *
 * Use `react-router reveal entry.client`, if the file is missing in your project
 *
 * @example entry.client.tsx
 * import { loadInitialLocale } from "lingui-react-router/client"
 * import { startTransition, StrictMode } from "react"
 * import { hydrateRoot } from "react-dom/client"
 * import { HydratedRouter } from "react-router/dom"
 *
 * startTransition(async () => {
 *   await loadInitialLocale(location.pathname)
 *   hydrateRoot(
 *     document,
 *     <StrictMode>
 *       <HydratedRouter />
 *     </StrictMode>
 *   )
 * })
 *
 * @param pathname A `location.pathname` value.
 * @returns The initialized I18n instance bound to the detected locale.
 */
export async function loadInitialLocale(pathname: string) {
  const locale = parseUrlLocale(pathname) || defaultLocale
  const messages = await loadLocaleCatalog(locale)

  i18n.loadAndActivate({ locale, messages })
}

/**
 * Parses a URL pathname to extract the locale code and remaining path.
 *
 * @param pathname Pathname to parse. Must start with a slash.
 * @returns An object containing path information.
 */
function parseUrlLocale(pathname: string): string | undefined {
  if (pathname === "/") {
    return undefined
  }

  const match = /^\/+([^/]+)\/?.*$/.exec(pathname)
  if (match) {
    const [, localeParam] = match
    const { locale } = findPathLocale(localeParam)
    return locale
  }
}
