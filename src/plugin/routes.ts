import type { LinguiConfig } from "@lingui/conf"
import { normalizeLocaleKey } from "../config"

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
  withDefault: boolean = true,
): string[] {
  const result = config.locales.map(loc => `/${normalizeLocaleKey(loc)}${path}`)
  if (withDefault) {
    result.push(path)
  }
  return result
}
