import type { FallbackLocales } from "@lingui/conf"

export type LinguiRouterConfig = {
  /**
   * List of supported locales.
   */
  locales: string[]
  /**
   * Locale code for pseudo-localization.
   */
  pseudoLocale?: string
  /**
   * Locale code for source language.
   */
  sourceLocale?: string
  /**
   * Fallback locales configuration.
   */
  fallbackLocales: FallbackLocales
  /**
   * Default locale to use when no locale is detected.
   */
  defaultLocale: string
  /**
   * One or more root-level path prefixes that should NOT be treated as locales.
   * For example, ["api"].
   */
  exclude: string[]
  /**
   * Redirect behavior for detected locales.
   */
  redirect: RedirectBehavior
  /**
   * Current execution environment.
   */
  runtimeEnv: "client" | "server"
}

/**
 * Result of parsing locale information from a URL path.
 */
export type PathLocale = {
  /** The path portion after the locale or excluded prefix. */
  pathname: string
  /** The detected locale, if any. */
  locale?: string
  /** True if the path matched an excluded prefix rather than a locale. */
  excluded: boolean
}

/**
 * Interface representing a locale manifest, mapping locale codes to their corresponding message catalog paths.
 *
 * Keys are locale codes (e.g., "en", "it"), and values are paths to message catalogs (e.g., "/locales/en/messages.po").
 */
export type LocaleManifest = Record<string, string>

/**
 * Redirect behavior for detected locales.
 *
 * - "auto": Redirect to detected locale only if it's not the default locale.
 * - "always": Always redirect to detected locale, even if it's the default locale.
 * - "never": Never redirect to detected locale.
 */
export type RedirectBehavior = "auto" | "always" | "never"

/**
 * Internal function to parse a URL path and extract locale information.
 *
 * @param config - Lingui router configuration.
 * @returns A function that takes a URL path and returns locale information.
 */
export function buildUrlParserFunction(config: LinguiRouterConfig): (url: string) => PathLocale {
  const localesRegex = buildParserRegex(config.locales, config.exclude)

  return function parseUrlLocale(url: string): PathLocale {
    if (url === "/") {
      return { locale: undefined, pathname: "/", excluded: false }
    }
    const match = localesRegex.exec(url)
    if (match) {
      const { l, e, p } = match.groups ?? {}
      if (l) {
        return { locale: l, pathname: p, excluded: false }
      } else if (e) {
        return { locale: undefined, pathname: url, excluded: true }
      }
    }
    return { locale: undefined, pathname: url, excluded: false }
  }
}

function buildParserRegex(locales: string[], exclude?: string[]) {
  const patterns = [toGroupPattern("l", locales), toGroupPattern("e", exclude)].filter(Boolean)
  return new RegExp(`^/(?:${patterns.join("|")})(?<p>/.*)?$`)
}

function toGroupPattern(name: string, list?: string[]): string {
  if (!list || list.length === 0) return ""
  return `(?<${name}>${list.map(v => v.replace(/[^a-zA-Z0-9/_-]/g, "\\$&")).join("|")})`
}
