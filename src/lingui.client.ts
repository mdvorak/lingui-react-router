import { type I18n, setupI18n } from "@lingui/core"
import { I18nAppConfig } from "./config"
import { setGlobalRef } from "./globals"

let i18nRef: I18n

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
export async function setupLingui(config: I18nAppConfig, pathname: string) {
  setGlobalRef(config, () => i18nRef)

  const locale = config.parseUrlLocale(pathname).locale || config.defaultLocale
  const messages = await config.loadCatalog(locale)

  i18nRef = setupI18n({
    locale: locale,
    messages: { [locale]: messages },
  })
  return i18nRef
}
