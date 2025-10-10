import { I18nProvider } from "@lingui/react"
import React, { useEffect } from "react"
import { useLocation } from "react-router"
import { $getI18nInstance } from "virtual:lingui-router-loader"
import { usePathLocale } from "./lingui"
import { loadLocaleCatalog } from "./runtime"

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
 * @param props.children - The child components to be rendered within the i18n context
 */
export function I18nApp({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { locale } = usePathLocale(location) // context is not set up yet, so we provide it
  const i18n = $getI18nInstance(locale)

  useEffect(() => {
    // This is executed only client-side
    const localeDidChange = locale !== i18n.locale
    if (localeDidChange) {
      if (locale in i18n.messages) {
        i18n.activate(locale)
      } else {
        loadLocaleCatalog(locale).then(messages => i18n.loadAndActivate({ locale, messages }))
      }
    }
  }, [locale])

  // @ts-ignore
  const childrenRender = typeof children === "function" ? children(i18n) : children

  return <I18nProvider i18n={i18n}>{childrenRender}</I18nProvider>
}
