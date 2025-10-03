import { useMemo } from "react"
import { useLocation } from "react-router"
import { config, parseUrlLocale } from "./runtime"

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
      locale: requestLocale || config.defaultLocale,
      pathname,
      excluded,
    }
  }, [location.pathname])
}
