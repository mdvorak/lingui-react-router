import { i18n } from "@lingui/core"
import { defaultLocale, loadLocaleCatalog, parseUrlLocale } from "./runtime"

if (typeof window === "undefined") {
  throw new Error("lingui.client.ts must be imported only on client")
}

/**
 * Setup lingui for client-side rendering.
 *
 * Use `react-router reveal entry.client`, if the file is missing in your project
 *
 * @example entry.client.tsx
 * import { setupLingui } from "lingui-react-router/client"
 * import { startTransition, StrictMode } from "react"
 * import { hydrateRoot } from "react-dom/client"
 * import { HydratedRouter } from "react-router/dom"
 *
 * startTransition(async () => {
 *   await loadInitialLocale(location.pathname)
 *
 *   hydrateRoot(
 *     document,
 *     <StrictMode>
 *       <HydratedRouter />
 *     </StrictMode>)
 * })
 *
 * @param config Imported extended lingui config
 * @param pathname A `location.pathname` value.
 */
/**
 * @returns The initialized I18n instance bound to the detected locale.
 */
export async function loadInitialLocale(pathname: string) {
  const locale = parseUrlLocale(pathname).locale || defaultLocale
  const messages = await loadLocaleCatalog(locale)

  i18n.loadAndActivate({ locale, messages })
}
