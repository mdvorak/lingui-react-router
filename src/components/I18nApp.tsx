import { I18nProvider } from "@lingui/react"
import React, { useEffect, useMemo } from "react"
import { useParams } from "react-router"
import { $getI18nInstance } from "virtual:lingui-router-loader"
import { findLocale } from "../i18n"
import { config, loadLocaleCatalog } from "../runtime"

/**
 * The I18nApp component provides internationalization context to the application.
 * It should be used within a layout component.
 *
 * It is recommended to split Layout into two components, otherwise useLingui() won't work
 * properly.
 *
 * @example
 * // root.tsx
 * function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
 *   const { i18n } = useLingui()
 *   return (
 *     <html lang={i18n.locale}>
 *       <head>
 *         <Meta />
 *         <Links />
 *         <LocalePreload />
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
 * export function Layout({ children }: Readonly<{ children: ReactNode }>) {
 *   return (
 *     <I18nApp>
 *       <RootLayout>{children}</RootLayout>
 *     </I18nApp>
 *   )
 * }
 *
 * @param props - The component props
 * @param props.children - The child components to be rendered within the i18n context
 */
export function I18nApp({ children }: Readonly<{ children: React.ReactNode }>) {
  const localeParamName = config.localeParamName
  const params = useParams()

  const { i18n, locale } = useMemo(() => {
    const localeParam = params[localeParamName]
    const resolvedLocale = findLocale(localeParam).locale ?? config.defaultLocale
    return {
      locale: resolvedLocale,
      i18n: $getI18nInstance(resolvedLocale),
    }
  }, [params[localeParamName]])

  useEffect(() => {
    // This is executed only client-side
    const localeDidChange = locale !== i18n.locale
    if (localeDidChange) {
      if (locale in i18n.messages) {
        i18n.activate(locale)
      } else {
        loadLocaleCatalog(locale)
          .then(messages => i18n.loadAndActivate({ locale, messages }))
          .catch(err => console.error("Failed to load locale ", locale, " catalog:", err))
      }
    }
  }, [i18n, locale])

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>
}
