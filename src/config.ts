import type { FallbackLocales } from "@lingui/conf"
import { type Messages, setupI18n } from "@lingui/core"

export type LinguiRouterConfig = {
  locales: string[]
  pseudoLocale?: string
  sourceLocale?: string
  fallbackLocales?: FallbackLocales
  defaultLocale: string
  /**
   * One or more root-level path prefixes that should NOT be treated as locales.
   * For example, ["api"].
   */
  exclude?: string[]
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

// noinspection JSUnusedGlobalSymbols
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
  return `(?<${name}>${list.map(v => v.replace(/[^a-zA-Z0-9\/_-]/g, "\\$&")).join("|")})`
}

// noinspection JSUnusedGlobalSymbols
export function buildI18n(locale: string, messages: Messages) {
  return setupI18n({
    locale,
    messages: { [locale]: messages },
  })
}
