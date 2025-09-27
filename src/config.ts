/**
 * I18n-aware routing configuration utilities for React Router + Lingui.
 *
 * This module exposes helpers to:
 * - Parse a locale from an incoming URL while respecting excluded paths.
 * - Generate localized route entries for React Router file-based routing.
 * - Lazily load Lingui message catalogs for a given locale.
 *
 * All public types and functions are documented with TSDoc to facilitate API docs generation.
 */

import type { LinguiConfig } from "@lingui/conf"
import type { Messages } from "@lingui/core"
import { route, type RouteConfigEntry } from "@react-router/dev/routes"

/**
 * Configuration passed from the consumer to wire up catalog loading and path exclusions.
 */
export type I18nConfig = {
  /**
   * Must be imported modules, otherwise vite build will fail.
   *
   * @example
   * import { defineConfig } from "lingui-react-router"
   * import linguiConfig from "./lingui.config"
   *
   * export default defineConfig(linguiConfig, {
   *   catalogModules: import.meta.glob("./app/**\/*.po"),
   * })
   */
  catalogModules: Record<string, any>
  /**
   * One or more root-level path prefixes that should NOT be treated as locales.
   * For example, ["api"].
   */
  exclude?: string | string[]
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
 * Public application configuration produced by defineConfig.
 */
export type I18nAppConfig = Readonly<{
  /** All supported locales, in order of preference. */
  locales: readonly string[]
  /** Optional pseudo locale from Lingui configuration. */
  pseudoLocale?: string
  /** Default locale used. */
  defaultLocale: string
  /** Excluded path prefixes that should not be interpreted as locales. */
  exclude: readonly string[]

  /**
   * Parse the locale and remaining pathname from a URL path (e.g. "/en/products").
   */
  parseUrlLocale(url: string): PathLocale
  /**
   * Load and merge all Lingui message catalogs for the given locale.
   */
  loadCatalog(locale: string): Promise<Messages>
  /**
   * Create localized route entries for a given path and file.
   * For example, `route("products", "routes/products.tsx")` will generate entries
   * for each locale as `["en/products", "pseudo/products", ...]`
   */
  route(path: string, file: string, children?: RouteConfigEntry[]): RouteConfigEntry[]
  /**
   * Create index routes for every locale root ("/en", "/cs", etc.).
   */
  index(file: string, children?: RouteConfigEntry[]): RouteConfigEntry[]
}>

// TODO support fallbackLocales

/**
 * Create an I18nAppConfig from Lingui and user configuration.
 *
 * Throws if required Lingui settings are missing.
 */
export function defineConfig(linguiConfig: LinguiConfig, config: I18nConfig): I18nAppConfig {
  if (linguiConfig.locales.length === 0) {
    throw new Error("No locale found. Please configure locales in Lingui config")
  }

  if (!linguiConfig.catalogs?.length) {
    throw new Error("No catalogs found. Please configure catalogs in Lingui config")
  }

  return new I18nAppConfigImpl(linguiConfig, config)
}

/**
 * Internal implementation of I18nAppConfig.
 */
class I18nAppConfigImpl implements I18nAppConfig {
  public readonly locales: readonly string[]
  public readonly pseudoLocale?: string
  public readonly defaultLocale: string
  public readonly exclude: readonly string[]

  // private state
  readonly #catalogPaths: readonly string[]
  readonly #catalogModules: Readonly<Record<string, any>>
  readonly #localesRegex: RegExp
  readonly #routePrefixes: readonly string[]

  /**
   * Build the app config using Lingui project settings and user options.
   */
  constructor(lingui: LinguiConfig, cfg: I18nConfig) {
    const locales = lingui.locales.slice()

    const exclude = typeof cfg.exclude === "string" ? [cfg.exclude] : cfg.exclude || []
    const rootDir = `${lingui.rootDir || "."}/`.replace(/\/+/g, "/")

    const catalogPaths = [...new Set(lingui.catalogs?.map(c => rootDir + c.path))]

    const defaultFallbackLocale =
      typeof lingui.fallbackLocales === "object" ? lingui.fallbackLocales?.default : undefined

    this.locales = locales
    this.pseudoLocale = lingui.pseudoLocale
    this.defaultLocale = defaultFallbackLocale || locales[0]
    this.exclude = exclude

    this.#catalogPaths = catalogPaths
    this.#catalogModules = cfg.catalogModules
    this.#localesRegex = I18nAppConfigImpl.#buildRegex(locales, exclude)
    this.#routePrefixes = [""].concat(locales.map(loc => loc + "/"))
  }

  public readonly parseUrlLocale = this.#parseUrlLocale.bind(this)
  public readonly loadCatalog = this.#loadCatalog.bind(this)
  public readonly route = this.#route.bind(this)
  public readonly index = this.#index.bind(this)

  #parseUrlLocale(url: string): PathLocale {
    if (url === "/") {
      return { locale: undefined, pathname: "/", excluded: false }
    }
    const match = this.#localesRegex.exec(url)
    if (match) {
      const [, locale, excluded, pathname] = match
      if (locale) {
        return { locale, pathname, excluded: false }
      } else if (excluded) {
        return { locale: undefined, pathname: url, excluded: true }
      }
    }
    return { locale: undefined, pathname: url, excluded: false }
  }

  #route(path: string, file: string, children?: RouteConfigEntry[]): RouteConfigEntry[] {
    return this.#routePrefixes
      .filter(p => p + path)
      .map(p => route(p + path, file, { id: p + file }, children))
  }

  #index(file: string, children?: RouteConfigEntry[]): RouteConfigEntry[] {
    return this.locales.map(loc => route(loc, file, { id: loc + file }, children))
  }

  // private helpers
  /** Ensure the locale is supported. */
  #normalizeLocale(locale: string) {
    if (!this.locales.includes(locale)) {
      throw new Error(`Unsupported locale: ${locale}`)
    }
    return locale
  }

  /** Load and merge all catalogs for the normalized locale. */
  async #loadCatalog(locale: string): Promise<Messages> {
    const definedLocale = this.#normalizeLocale(locale)

    const messages = await Promise.all(
      this.#catalogPaths
        .map(path => path.replace("{locale}", definedLocale) + ".po")
        .map(path => this.#resolveCatalog(path))
    )
    return Object.assign({}, ...messages) as Messages
  }

  /** Resolve and import a single catalog file/module. */
  async #resolveCatalog(path: string) {
    const catalog = this.#catalogModules[path]
    if (!catalog) throw new Error(`Catalog module not found: ${path}`)
    const messages = typeof catalog === "function" ? await catalog() : catalog
    return messages.messages ?? messages.default
  }

  /** Convert a string list into a single regex group pattern. */
  static #toGroupPattern(list: readonly string[]): string {
    if (list.length === 0) return ""
    return "(" + list.map(v => v.replace(/[^a-zA-Z0-9\/_-]/g, "\\$&")).join("|") + ")"
  }

  /** Build the main regex used to parse locales and excluded prefixes from paths. */
  static #buildRegex(locales: readonly string[], exclude: readonly string[]): RegExp {
    return new RegExp(
      `^/(?:${this.#toGroupPattern(locales)}|${this.#toGroupPattern(exclude)})(/.*)?$`
    )
  }
}
