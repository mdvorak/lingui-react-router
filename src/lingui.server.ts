import { type I18n, setupI18n } from "@lingui/core"
import { type I18nContext } from "@lingui/react"
import Negotiator from "negotiator"
import { AsyncLocalStorage } from "node:async_hooks"
import { redirect, type RedirectFunction } from "react-router"
import { I18nAppConfig } from "./config"
import { getGlobalRef, initI18n, setGlobalRef } from "./globals"

/**
 * A utility type for server-side i18n context.
 */
type I18nRequestContext = {
  /** The internationalization processing object, which manages locale-specific content and configurations. */
  i18n: I18n
  /** The URL object for the current request, representing its full path and query parameters. */
  url: URL
  /** An optional string indicating the locale explicitly requested. */
  requestLocale?: string
  /** The pathname of the current request, used to determine or generate locale-specific responses. */
  requestPathname: string
}

/**
 * Server-side i18n context with additional properties.
 */
export type I18nServerContext = I18nContext &
  I18nRequestContext & {
    pathnamePrefix: string
    redirect: RedirectFunction
  }

const localeContextStorage = new AsyncLocalStorage<I18nRequestContext>()

export function createLocaleMiddleware(config: I18nAppConfig): typeof localeMiddleware {
  // Lazy-initialized reference
  let loadedLocales: Record<string, I18n>

  // This will trigger eager init
  const loadPromise = loadAllLocales(config).then(locales => (loadedLocales = locales))

  // Initialize global
  setGlobalRef(config, (locale: string): I18n => loadedLocales[locale])

  // Return middleware
  return async (args: { request: Request }, next: () => Promise<Response>) => {
    // Wait for lazy init
    await loadPromise
    // Run the actual middleware
    return localeMiddleware(args, next)
  }
}

async function localeMiddleware({ request }: { request: Request }, next: () => Promise<Response>): Promise<Response> {
  const { config } = getGlobalRef()

  const url = new URL(request.url)
  const location = config.parseUrlLocale(url.pathname)
  const { pathname, excluded } = location
  let locale = location.locale

  if (!locale) {
    // Get locale from Accept-Encoding header
    const preferredLocale = getPreferredLocale(request)
    if (preferredLocale) {
      if (!excluded && preferredLocale !== config.defaultLocale) {
        // Redirect to preferred locale
        throw redirect(`/${preferredLocale}${pathname}${url.search}${url.hash}`)
      } else if (excluded) {
        // Use preferred locale for API requests
        locale = preferredLocale
      }
    }
  }

  const i18n = initI18n(locale || config.defaultLocale)

  // Run the handler in the storage context
  return localeContextStorage.run({ i18n, url, requestLocale: locale, requestPathname: pathname }, async () => {
    const response = await next()
    response.headers.set("Content-Language", i18n.locale)
    return response
  })
}

function getPreferredLocale(request: Request): string | undefined {
  const acceptLanguage = request.headers.get("Accept-Language")
  if (!acceptLanguage) return

  const negotiator = new Negotiator({ headers: { "accept-language": acceptLanguage } })
  return negotiator.language()?.split("-", 2)[0]
}

async function loadAllLocales(config: I18nAppConfig): Promise<Record<string, I18n>> {
  const locales = config.locales
  const catalogs = await Promise.all(locales.map(loc => config.loadCatalog(loc)))

  return locales.reduce((acc, locale, index) => {
    const messages = catalogs[index]
    if (!messages) throw new Error(`Catalog for ${locale} not found`)

    const i18n = setupI18n({
      locale,
      messages: { [locale]: messages },
    })
    return { ...acc, [locale]: i18n }
  }, {})
}
