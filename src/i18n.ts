import { useMemo } from "react"
import { useLocation } from "react-router"
import { normalizeLocaleKey, type PathLocale } from "./config"
import { config, defaultLocale, fallbackLocales, normalizeLocale, supportedLocales, } from "./runtime"

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
export function usePathLocale(location = useLocation()): {
  locale: string
  requestLocale?: string
  pathname: string
  excluded: boolean
} {
  return useMemo(() => {
    const { locale: requestLocale, pathname, excluded } = parseUrlLocale(location.pathname)
    return {
      requestLocale,
      locale: requestLocale || defaultLocale,
      pathname,
      excluded,
    }
  }, [location.pathname])
}

const localePathRegex = /^\/+([^/]+)(\/.*)?$/

/**
 * Parses a URL pathname to extract the locale code and remaining path.
 *
 * @param url Pathname to parse. Must start with a slash.
 * @returns An object containing path information.
 */
export function parseUrlLocale(url: string): PathLocale {
  if (url === "/") {
    return { locale: undefined, pathname: "/", excluded: false }
  }

  const match = localePathRegex.exec(url)
  if (match) {
    const [, rawLocale, p] = match
    const pathname = p || "/"
    const locale = normalizeLocale(rawLocale)
    if (supportedLocales.has(locale)) {
      return { locale, rawLocale, pathname, excluded: false }
    } else if (config.exclude.includes(rawLocale)) {
      return { locale: undefined, pathname: url, excluded: true }
    }

    // Support translation of nested locales, e.g. "en-US" -> "en"
    // Note that keys in fallbackLocales are stored as keys, not in canonical form,
    // but values are already canonical.
    const resolvedLocale = fallbackLocales?.[normalizeLocaleKey(rawLocale)]
    if (resolvedLocale && supportedLocales.has(resolvedLocale)) {
      return { locale: resolvedLocale, rawLocale, pathname, excluded: false }
    }
  }
  return { locale: undefined, pathname: url, excluded: false }
}
