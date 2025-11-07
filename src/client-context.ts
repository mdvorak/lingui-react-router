import React from "react"
import type { Location, NavigateFunction } from "react-router"
import { normalizeLocaleKey } from "./config"
import { config, localeMapping, supportedLocales } from "./runtime"

/**
 * The context for locale information derived from the URL path.
 */
export const LocalePathContext = React.createContext<PathLocale | null>(null)

/**
 * Represents the locale information derived from the URL path.
 */
export type PathLocale = {
  /**
   * The resolved locale code (falls back to defaultLocale).
   */
  locale: string
  /**
   * An optional string indicating the locale explicitly requested.
   */
  requestLocale?: string
  /**
   * The pathname of the current request, can be used to build locale-specific urls.
   */
  requestPathname: string
  /**
   * Navigate to a new locale, preserving the request pathname, search, and hash parameters.
   *
   * @param locale The locale code to change to, or empty to remove the locale prefix.
   */
  changeLocale: (locale: string | undefined) => Promise<void> | void
}

/**
 * React hook that derives the active locale from the current URL path.
 *
 * @returns A `PathLocale` object containing locale information.
 */
export function usePathLocale(): PathLocale {
  const context = React.useContext(LocalePathContext)
  if (!context) {
    throw new Error("usePathLocale must be used within a I18nApp component")
  }
  return context
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
  /** The resolved locale code if found, otherwise undefined. */
  locale?: string
  /** Boolean indicating if the path matches an excluded prefix. */
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

/**
 * Creates a PathLocale context object.
 *
 * This is an internal function used by I18nApp.
 *
 * @param navigate The navigate function for changing the locale. See `useNavigate()`.
 * @param localeParam The locale segment extracted from the URL path. See `useParams()`.
 * @param locale The resolved locale code.
 * @param location The current location object.
 */
export function createLocalePathContext(navigate: NavigateFunction,
                                        localeParam: string | undefined,
                                        locale: string,
                                        location: Location<any>): PathLocale {
  const requestPathname = localeParam
    ? stripPathnameLocalePrefix(location.pathname, localeParam)
    : location.pathname

  return {
    locale,
    ...(localeParam && { requestLocale: locale }),
    requestPathname,
    changeLocale(nextLocale) {
      return navigateToLocale(navigate, nextLocale, requestPathname, location)
    },
  }
}

function navigateToLocale(navigate: NavigateFunction,
                          nextLocale: string | undefined,
                          requestPathname: string,
                          location: Location<any>) {
  const nextPathname = nextLocale ? `/${normalizeLocaleKey(nextLocale)}${requestPathname}` : requestPathname

  // Navigate only if pathname differs
  if (nextPathname !== location.pathname) {
    return navigate({
      pathname: nextPathname,
      search: location.search,
      hash: location.hash,
    }, { preventScrollReset: true })
  }
}
