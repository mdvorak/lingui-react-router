import { useMemo } from "react"
import { useLocation, useParams } from "react-router"
import { normalizeLocaleKey } from "./config"
import { config, defaultLocale, localeMapping, supportedLocales } from "./runtime"

/**
 * Represents the locale information derived from the URL path.
 */
export type PathLocale = {
  /** The resolved locale code (falls back to defaultLocale). */
  locale: string
  /** An optional string indicating the locale explicitly requested. */
  requestLocale?: string
  /** The pathname of the current request, can be used to build locale-specific urls. */
  requestPathname: string
}

/**
 * React hook that derives the active locale from the current URL path.
 *
 * @returns An object containing:
 * - `locale` - The resolved locale code (falls back to defaultLocale)
 * - `requestLocale` - The locale code extracted from the URL path, if any
 * - `requestPathname` - The pathname without the locale prefix
 */
export function usePathLocale(): PathLocale {
  const location = useLocation()
  const params = useParams()

  return useMemo(() => {
    const localeParam = params[config.localeParamName]
    const { locale } = findPathLocale(localeParam)
    // Use relative pathname only if locale was found
    const requestPathname = locale
      ? stripPathnameLocalePrefix(location.pathname, localeParam)
      : location.pathname

    return {
      requestLocale: locale,
      locale: locale || defaultLocale,
      requestPathname,
    }
  }, [params[config.localeParamName], location.pathname])
}

/**
 * Finds and resolves the locale from a URL path segment.
 *
 * @param localeParam The locale segment extracted from the URL path. Should not be normalized.
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
export function stripPathnameLocalePrefix(
  pathname: string,
  localeParam: string | undefined
): string {
  if (localeParam && pathname.startsWith(`/${localeParam}`)) {
    return pathname.slice(localeParam.length + 1) || "/"
  }
  return pathname
}
