import { useMemo } from "react"
import { useLocation, useParams } from "react-router"
import { normalizeLocaleKey } from "./config"
import { config, defaultLocale, localeMapping, supportedLocales } from "./runtime"

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
 */
export function usePathLocale(): {
  locale: string
  requestLocale?: string
  pathname: string
  excluded: boolean
} {
  const location = useLocation()
  const params = useParams()

  return useMemo(() => {
    const localeParam = params[config.localeParamName]
    const { locale, excluded } = findPathLocale(localeParam)
    // Use relative pathname only if locale was found
    const pathname = locale
      ? parseLocalePathname(location.pathname, localeParam)
      : location.pathname

    return {
      requestLocale: locale,
      locale: locale || defaultLocale,
      pathname,
      excluded,
    }
  }, [params[config.localeParamName], location.pathname])
}

/**
 * Finds and resolves the locale from a URL path segment.
 *
 * @param localeParam The locale segment extracted from the URL path.
 * @returns An object containing:
 * - `locale` - The resolved locale code if found, otherwise undefined
 * - `excluded` - Boolean indicating if the path matches an excluded prefix
 */
export function findPathLocale(localeParam: string | undefined): {
  locale?: string
  excluded: boolean
} {
  // No locale segment
  if (!localeParam) {
    return { excluded: false }
  }

  // Normalize locale key
  const locale = normalizeLocaleKey(localeParam)

  // Direct match
  if (supportedLocales.has(locale)) {
    return { locale, excluded: false }
  }
  // Excluded path
  if (config.exclude.includes(localeParam)) {
    return { excluded: true }
  }

  // Mapped locale
  const resolvedLocale = localeMapping?.[locale]
  if (resolvedLocale && resolvedLocale !== locale) {
    return findPathLocale(resolvedLocale)
  }

  return { excluded: false }
}

/**
 * Parses the pathname to remove the locale prefix.
 *
 * @param pathname The full URL pathname (e.g., "/en/products")
 * @param localeParam The locale segment extracted from the URL path (e.g., "en")
 * @returns The pathname without the locale prefix (e.g., "/products")
 */
export function parseLocalePathname(pathname: string, localeParam: string | undefined): string {
  if (localeParam && pathname.startsWith(`/${localeParam}`)) {
    return pathname.slice(localeParam.length + 1) || "/"
  }
  return pathname
}
