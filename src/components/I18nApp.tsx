import type { I18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import React, { useEffect, useMemo } from "react"
import {
  type Location,
  type NavigateFunction,
  useLocation,
  useNavigate,
  useParams,
} from "react-router"
import { $getI18nInstance } from "virtual:lingui-router-loader"
import { findLocale, LocalePathContext, stripPathnameLocalePrefix } from "../client-context"
import { logger } from "../logger"
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
    logger?.debug("Resolved path", location.pathname, "as locale", resolvedLocale)
    return {
      locale: resolvedLocale,
      i18n: $getI18nInstance(resolvedLocale),
    }
  }, [localeParam])

  const context = useMemo(() => {
    return resolveLocalePathContext(localeParam, locale, location)
  }, [localeParam, locale, location.pathname])

  // Configure i18n instance based on selected locale
  useEffect(() => {
    loadAndActivateLocale(i18n, locale)
  }, [i18n, locale])

  // Normalize locale in the url path, if needed
  useEffect(() => {
    // Navigate to normalize locale in the url
    normalizeLocationLocale(localeParam, locale, location, navigate)
  }, [localeParam, locale]) // We don't need to re-run this effect if location changes

  return (
    <LocalePathContext value={context}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </LocalePathContext>
  )
}

function resolveLocalePathContext(localeParam: string | undefined, locale: string, location: Location<any>) {
  if (localeParam) {
    // Use resolved locale only if locale is in the URL (localeParam is not empty)
    return {
      locale,
      requestLocale: locale,
      requestPathname: stripPathnameLocalePrefix(location.pathname, localeParam),
    }
  } else {
    // No locale in the URL, pass it as it is
    return {
      locale,
      requestPathname: location.pathname,
    }
  }
}

function loadAndActivateLocale(i18n: I18n, locale: string) {
  if (locale !== i18n.locale) {
    if (locale in i18n.messages) {
      // Already loaded
      logger?.log(`Activating locale ${locale}`)
      i18n.activate(locale)
    } else {
      // Load locale catalog and set the locale when loaded
      // Note that this presents a race condition, but there is no way to avoid it
      logger?.log(`Loading locale catalog for ${locale}`)
      loadLocaleCatalog(locale)
        .then(messages => i18n.loadAndActivate({ locale, messages }))
        .catch(err => logger?.error(`Failed to load locale "${locale}" catalog:`, err))
    }
  }
}

function normalizeLocationLocale(localeParam: string | undefined,
                                 locale: string,
                                 location: Location,
                                 navigate: NavigateFunction) {
  if (localeParam && localeParam !== locale) {
    const requestPathname = stripPathnameLocalePrefix(location.pathname, localeParam)
    const nextPath = `/${locale}${requestPathname}${location.search}${location.hash}`
    logger?.log(`Detected badly formatted locale (${localeParam}) navigating to ${locale}:`, nextPath)

    navigate(nextPath, {
      replace: true,
      preventScrollReset: true,
    })
  }
}
