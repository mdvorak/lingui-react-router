import type { LinguiConfig } from "@lingui/conf"
import type { Messages } from "@lingui/core"
import { route, type RouteConfigEntry } from "@react-router/dev/routes"

export type I18nConfig = {
  catalogModules: Record<string, any>
  exclude?: string | string[]
}

export type PathLocale = {
  pathname: string
  locale?: string
  excluded: boolean
}

export type I18nAppConfig = Readonly<{
  locales: readonly string[]
  pseudoLocale?: string
  defaultLocale: string
  exclude: string[]

  parseUrlLocale(url: string): PathLocale
  loadCatalog(locale: string): Promise<Messages>
  route(path: string, file: string, children?: RouteConfigEntry[]): RouteConfigEntry[]
  index(file: string, children?: RouteConfigEntry[]): RouteConfigEntry[]
}>

// TODO support fallbackLocales

export function defineConfig(linguiConfig: LinguiConfig, config: I18nConfig): I18nAppConfig {
  if (linguiConfig.locales.length === 0) {
    throw new Error("No locale found. Please configure locales in Lingui config")
  }

  if (!linguiConfig.catalogs?.length) {
    throw new Error("No catalogs found. Please configure catalogs in Lingui config")
  }

  return new I18nAppConfigImpl(linguiConfig, config)
}

class I18nAppConfigImpl implements I18nAppConfig {
  public readonly locales: readonly string[]
  public readonly pseudoLocale?: string
  public readonly defaultLocale: string
  public readonly exclude: string[]

  // private state
  readonly #catalogPaths: readonly string[]
  readonly #catalogModules: Readonly<Record<string, any>>
  readonly #localesRegex: RegExp
  readonly #routePrefixes: readonly string[]

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

  parseUrlLocale(url: string): PathLocale {
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

  async loadCatalog(locale: string): Promise<Messages> {
    return this.#loadCatalog(this.#normalizeLocale(locale))
  }

  route(path: string, file: string, children?: RouteConfigEntry[]): RouteConfigEntry[] {
    return this.#routePrefixes
      .filter(p => p + path)
      .map(p => route(p + path, file, { id: p + file }, children))
  }

  index(file: string, children?: RouteConfigEntry[]): RouteConfigEntry[] {
    return this.locales.map(loc => route(loc, file, { id: loc + file }, children))
  }

  // private helpers
  #normalizeLocale(locale: string) {
    if (!this.locales.includes(locale)) {
      throw new Error(`Unsupported locale: ${locale}`)
    }
    return locale
  }

  async #loadCatalog(locale: string): Promise<Messages> {
    const messages = await Promise.all(
      this.#catalogPaths
        .map(path => path.replace("{locale}", locale) + ".po")
        .map(path => this.#resolveCatalog(path))
    )
    return Object.assign({}, ...messages) as Messages
  }

  async #resolveCatalog(path: string) {
    const catalog = this.#catalogModules[path]
    if (!catalog) throw new Error(`Catalog module not found: ${path}`)
    const messages = typeof catalog === "function" ? await catalog() : catalog
    return messages.messages ?? messages.default
  }

  static #toGroupPattern(list: readonly string[]): string {
    if (list.length === 0) return ""
    return "(" + list.map(v => v.replace(/[^a-zA-Z0-9\/_-]/g, "\\$&")).join("|") + ")"
  }

  static #buildRegex(locales: readonly string[], exclude: readonly string[]): RegExp {
    return new RegExp(
      `^/(?:${this.#toGroupPattern(locales)}|${this.#toGroupPattern(exclude)})(/.*)?$`
    )
  }
}
