import type { I18n } from "@lingui/core"
import type { I18nContext } from "@lingui/react"
import { useEffect, useMemo } from "react"
import { useLocation } from "react-router"
import { I18nAppConfig } from "./config"
import { getGlobalRef, initI18n } from "./globals"

/**
 * Initialize a lingui instance within a page component for both client and server rendering.
 *
 * Use it in your root layout to initialize lingui for all pages.
 *
 * @param defaultComponent Optional component to use as default for translation components.
 */
export function initLingui(defaultComponent?: I18nContext["defaultComponent"]): I18n {
  const { locale } = useLocale()
  const i18n = useMemo(() => initI18n(locale, defaultComponent), [locale])

  useEffect(() => {
    const localeDidChange = locale !== i18n.locale
    if (localeDidChange) {
      const { config } = getGlobalRef()
      config.loadCatalog(locale).then(messages => i18n.loadAndActivate({ locale, messages }))
    }
  }, [i18n, locale])

  return i18n
}

/**
 * Access the immutable i18n application configuration.
 *
 * Useful for reading supported locales, defaultLocale, and helpers like
 * parseUrlLocale/route/index on the client.
 */
export function useI18nConfig(): Omit<I18nAppConfig, "loadCatalog"> {
  return getGlobalRef().config
}

/**
 * React hook that derives the active locale from the current URL path.
 *
 * @returns An object containing:
 * - `requestLocale` - The locale code parsed from the URL pathname (e.g., "en" from "/en/..."), or undefined if not present
 * - `locale` - The effective locale code (falls back to defaultLocale when requestLocale is not present)
 * - `pathname` - The remaining URL path after the locale prefix
 * - `excluded` - Boolean indicating if the path matches an excluded prefix
 *
 * @example
 * ```tsx
 * const { locale, requestLocale, pathname } = useLocale();
 * // URL: "/en/products"
 * // => { locale: "en", requestLocale: "en", pathname: "/products", excluded: false }
 *
 * // URL: "/products" (no locale prefix)
 * // => { locale: "en", requestLocale: undefined, pathname: "/products", excluded: false }
 * ```
 *
 * @see {@link I18nAppConfig['parseUrlLocale']} for the underlying URL parsing logic
 */
export function useLocale(): {
  locale: string
  requestLocale?: string
  pathname: string
  excluded: boolean
} {
  const location = useLocation()
  const { config } = getGlobalRef()
  return useMemo(() => {
    const { locale: requestLocale, pathname, excluded } = config.parseUrlLocale(location.pathname)
    return {
      requestLocale,
      locale: requestLocale || config.defaultLocale,
      pathname,
      excluded,
    }
  }, [location.pathname])
}
