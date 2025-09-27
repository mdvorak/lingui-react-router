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
  const locales = linguiConfig.locales.slice()
  const exclude = typeof config.exclude === "string" ? [config.exclude] : config.exclude || []
  const rootDir = `${linguiConfig.rootDir || "."}/`.replace(/\/+/g, "/")

  if (locales.length === 0) {
    throw new Error("No locale found. Please configure locales in Lingui config")
  }

  const catalogPaths = [...new Set(linguiConfig.catalogs?.map(c => rootDir + c.path))]
  if (catalogPaths.length === 0) {
    throw new Error("No catalog path found. Please configure catalogs in Lingui config")
  }

  const defaultFallbackLocale =
    typeof linguiConfig.fallbackLocales === "object"
      ? linguiConfig.fallbackLocales?.default
      : undefined

  // Create a regex pattern from locales for efficient URL parsing
  const localesRegex = buildRegex(locales, exclude)
  const routePrefixes = [""].concat(locales.map(loc => loc + "/"))

  return {
    locales,
    pseudoLocale: linguiConfig.pseudoLocale,
    defaultLocale: defaultFallbackLocale || locales[0],
    exclude,
    parseUrlLocale: url => parseUrlLocale(url, localesRegex),
    loadCatalog: locale =>
      loadCatalog(normalizeLocale(locale, locales), catalogPaths, config.catalogModules),
    route: (path, file, children) => {
      return routePrefixes
        .filter(p => p + path)
        .map(p => route(p + path, file, { id: p + file }, children))
    },
    index: (file, children) => {
      return locales.map(loc => route(loc, file, { id: loc + file }, children))
    },
  }
}

function toGroupPattern(list: readonly string[]): string {
  if (list.length === 0) return ""
  return "(" + list.map(v => v.replace(/[^a-zA-Z0-9\/_-]/g, "\\$&")).join("|") + ")"
}

function buildRegex(locales: readonly string[], apiPath: readonly string[]): RegExp {
  return new RegExp(`^/(?:${toGroupPattern(locales)}|${toGroupPattern(apiPath)})(/.*)?$`)
}

function parseUrlLocale(url: string, localesRegex: RegExp): PathLocale {
  if (url === "/") {
    return { locale: undefined, pathname: "/", excluded: false }
  }

  const match = localesRegex.exec(url)
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

function normalizeLocale(locale: string, locales: readonly string[]) {
  if (!locales.includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`)
  }
  return locale
}

async function loadCatalog(
  locale: string,
  catalogPaths: readonly string[],
  catalogModules: Readonly<Record<string, any>>
): Promise<Messages> {
  const messages = await Promise.all(
    catalogPaths
      .map(path => path.replace("{locale}", locale) + ".po")
      .map(path => resolveCatalog(path, catalogModules))
  )

  return Object.assign({}, ...messages) as Messages
}

async function resolveCatalog(path: string, catalogModules: Readonly<Record<string, any>>) {
  const catalog = catalogModules[path]
  if (!catalog) throw new Error(`Catalog module not found: ${path}`)

  const messages = typeof catalog === "function" ? await catalog() : catalog
  return messages.messages ?? messages.default
}
