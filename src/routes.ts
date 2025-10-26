import type { FallbackLocales, LinguiConfig } from "@lingui/conf"
import { route, type RouteConfigEntry } from "@react-router/dev/routes"
import { getSecondaryLocales } from "./config"

const LOCAL_PATH_REGEX = /^(?:\.\/)?/

export function localeRoutes(config: Readonly<LinguiConfig>) {
  const locales = buildAllLocalesList(config.locales, config.fallbackLocales)
  const routePrefixes = [""].concat(locales.map(loc => loc + "/"))

  return {
    /**
     * Create localized route entries for a given path and file.
     * For example, `route("products", "routes/products.tsx")` will generate entries
     * for each locale as `["en/products", "pseudo/products", ...]`
     */
    route(path: string, file: string, children?: RouteConfigEntry[]): RouteConfigEntry[] {
      return routePrefixes
        .filter(p => p + path)
        .map(p => route(p + path, file, { id: file.replace(LOCAL_PATH_REGEX, p) }, children))
    },
    /**
     * Create index routes for every locale root ("/en", "/cs", etc.).
     */
    index(file: string, children?: RouteConfigEntry[]): RouteConfigEntry[] {
      return locales.map(loc =>
        route(loc, file, { id: file.replace(LOCAL_PATH_REGEX, loc + "/") }, children)
      )
    },
  }
}

/**
 * Generate all locale-specific paths for a given base path.
 * For example, for path "/products" and locales ["en", "cs"], it returns:
 * ["/products", "/en/products", "/cs/products"]
 *
 * @param config Lingui configuration containing locales and fallbackLocales
 * @param path The base path to localize (e.g., "/products")
 * @param withDefault Whether to include the default (non-localized) path
 * @returns An array of localized paths
 */
export function localePaths(
  config: Readonly<LinguiConfig>,
  path: string,
  withDefault: boolean = true
): string[] {
  const locales = buildAllLocalesList(config.locales, config.fallbackLocales)
  const result = locales.map(loc => `/${loc}${path}`)
  if (withDefault) {
    result.push(path)
  }
  return result
}

/**
 * Builds a sorted, de-duplicated list of all known locale codes.
 *
 * Combines the primary `locales` with keys from `fallbackLocales`
 * (excluding the reserved `"default"` key).
 *
 * @param locales - Primary supported locales in priority order.
 * @param fallbackLocales - Optional mapping of locales to their fallbacks. Only its keys are considered; `"default"` is ignored.
 * @returns An array of all known locale codes.
 *
 * @example
 * // returns ["en", "fr", "it"]
 * buildAllLocalesList(["en", "it"], { default: "en", fr: ["en"] })
 */
function buildAllLocalesList(
  locales: string[],
  fallbackLocales?: FallbackLocales | false
): string[] {
  return [...locales, ...Object.keys(getSecondaryLocales(locales, fallbackLocales))]
}
