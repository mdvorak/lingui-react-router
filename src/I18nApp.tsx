import { I18nProvider } from "@lingui/react"
import React, { useEffect } from "react"
import { useLocation } from "react-router"
import { I18nAppConfig } from "./config"
import { I18nConfigContext } from "./context"
import { _getI18n } from "./globals"
import { useLocale } from "./lingui"

/**
 * The I18nApp component provides internationalization context to the application.
 * It should be used within a layout component.
 *
 * It is recommended to split Layout into two components, otherwise useLingui() won't work
 * properly.
 *
 * @example root.tsx
 * import i18nConfig from "../i18n.config"
 *
 * function RootLayout({ children }: { children: ReactNode }) {
 *   const { i18n } = useLingui()
 *
 *   return (
 *     <html lang={i18n.locale}>
 *       <head>
 *         <meta charSet="utf-8" />
 *         <meta name="viewport" content="width=device-width, initial-scale=1" />
 *         <title>{i18n._(msg`Lingui React Router App`)}</title>
 *         <Meta />
 *         <Links />
 *       </head>
 *       <body>
 *         {children}
 *         <ScrollRestoration />
 *         <Scripts />
 *       </body>
 *     </html>
 *   )
 * }
 *
 * export function Layout({ children }: { children: ReactNode }) {
 *   return (
 *     <I18nApp config={i18nConfig}>
 *       <RootLayout>{children}</RootLayout>
 *     </I18nApp>
 *   )
 * }
 *
 * @param props - The component props
 * @param props.config - The internationalization configuration object
 * @param props.children - The child components to be rendered within the i18n context
 */
export function I18nApp({
  config,
  children,
}: {
  config: I18nAppConfig
  children: React.ReactNode
}) {
  const location = useLocation()
  const { locale } = useLocale(location, config) // context is not set up yet, so we provide it
  const i18n = _getI18n(locale)

  useEffect(() => {
    // This is executed only client-side
    const localeDidChange = locale !== i18n.locale
    if (localeDidChange) {
      if (locale in i18n.messages) {
        i18n.activate(locale)
      } else {
        config.loadCatalog(locale).then(messages => i18n.loadAndActivate({ locale, messages }))
      }
    }
  }, [locale])

  // @ts-ignore
  const childrenRender = typeof children === "function" ? children(i18n) : children

  return (
    <I18nConfigContext.Provider value={config}>
      <I18nProvider i18n={i18n}>{childrenRender}</I18nProvider>
    </I18nConfigContext.Provider>
  )
}
