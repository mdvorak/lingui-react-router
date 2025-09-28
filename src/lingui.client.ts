import { i18n } from "@lingui/core"
import { I18nAppConfig } from "./config"
import { _initGetI18nRef } from "./globals"

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
 * import i18nConfig from "../i18n.config"
 *
 * startTransition(async () => {
 *   await setupLingui(i18nConfig, location.pathname)
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
export async function loadInitialLocale(config: I18nAppConfig, pathname: string) {
  const locale = config.parseUrlLocale(pathname).locale || config.defaultLocale
  const messages = await config.loadCatalog(locale)

  i18n.loadAndActivate({ locale, messages })
}

_initGetI18nRef(() => i18n)
