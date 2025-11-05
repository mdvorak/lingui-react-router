import { useMemo } from "react"
import { useLocation, useParams } from "react-router"
import { normalizeLocaleKey } from "./config"
import { $useLingui, config, localeMapping, supportedLocales } from "./runtime"

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
  const { i18n } = $useLingui()
  const localeParamName = config.localeParamName

  return useMemo(() => {
    const localeParam = params[localeParamName]
    // This is a shortcut - we assume that if localeParam is present, i18n.locale has
    // the corresponding locale code (normalized and found in supportedLocales)
    // This is ensured by I18nApp component
    const requestLocale = localeParam ? i18n.locale : undefined

    // Use relative pathname only if locale is in the URL
    const requestPathname = localeParam
      ? stripPathnameLocalePrefix(location.pathname, localeParam)
      : location.pathname

    return {
      requestLocale,
      locale: i18n.locale,
      requestPathname,
    }
  }, [params[localeParamName], location.pathname, i18n.locale])
}

/**
 * Finds and resolves the locale from a URL path segment.
 *
 * @param localeParam The locale segment extracted from the URL path. Should not be normalized.
 * @returns An object containing:
 * - `locale` - The resolved locale code if found, otherwise undefined
 * - `excluded` - Boolean indicating if the path matches an excluded prefix
 */
export function findLocale(localeParam: string | undefined): {
  locale?: string
  excluded: boolean
} {
  return findLocaleImpl(localeParam, new Set<string>())
}

function findLocaleImpl(
  localeParam: string | undefined,
  seen: Set<string>,
): {
  locale?: string
  excluded: boolean
} {
  // No locale segment
  if (!localeParam) {
    return { excluded: false }
  }

  // Normalize locale key
  const locale = normalizeLocaleKey(localeParam)

  // Cycle detection: if we've already attempted this normalized key, bail out
  if (seen.has(locale)) {
    throw new Error(`Circular localeMapping detected for locale "${locale}"`)
  }
  seen.add(locale)

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
    return findLocaleImpl(resolvedLocale, seen)
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
  localeParam: string | undefined,
): string {
  if (localeParam && pathname.startsWith(`/${localeParam}`)) {
    return pathname.slice(localeParam.length + 1) || "/"
  }
  return pathname
}
