import type { I18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import React, { useEffect, useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router"
import { $getI18nInstance } from "virtual:lingui-router-loader"
import { createLocalePathContext, findLocale, RouteLocaleContext } from "../client-context"
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
  const navigate = useNavigate()
  const location = useLocation()
  const localeParam = params[localeParamName]

  const { i18n, locale } = useMemo(() => {
    const resolvedLocale = findLocale(localeParam).locale ?? config.defaultLocale
    return {
      locale: resolvedLocale,
      i18n: $getI18nInstance(resolvedLocale),
    }
  }, [localeParam])

  const context = useMemo(() => {
    return createLocalePathContext(navigate, localeParam, locale, location)
  }, [localeParam, locale, location.pathname, navigate])

  // Configure i18n instance based on selected locale
  useEffect(() => {
    loadAndActivateLocale(i18n, locale)
  }, [i18n, locale])

  // Normalize locale in the url path, if needed
  useEffect(() => {
    // Navigate to normalized locale in the url
    if (localeParam && localeParam !== context.locale) {
      context.changeLocale(context.locale)
    }
  }, [localeParam, context])

  return (
    <RouteLocaleContext value={context}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </RouteLocaleContext>
  )
}

function loadAndActivateLocale(i18n: I18n, locale: string) {
  if (locale !== i18n.locale) {
    if (locale in i18n.messages) {
      // Already loaded
      i18n.activate(locale)
    } else {
      // Load locale catalog and set the locale when loaded
      // Note that this presents a race condition, but there is no way to avoid it
      loadLocaleCatalog(locale)
        .then(messages => i18n.loadAndActivate({ locale, messages }))
        .catch(err => console.error(`Failed to load locale '${locale}' catalog:`, err))
    }
  }
}
