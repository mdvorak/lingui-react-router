import { type I18n, setupI18n } from "@lingui/core"
import { type I18nContext } from "@lingui/react"
import Negotiator from "negotiator"
import { AsyncLocalStorage } from "node:async_hooks"
import { MiddlewareFunction, redirect, type RedirectFunction } from "react-router"
import { I18nAppConfig } from "./config"
import { initI18n, setGlobalRef } from "./globals"

const HTTP_ACCEPT_LANGUAGE = "accept-language"

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

/**
 * Hook to access the server-side i18n context. Use only in loaders and actions.
 *
 * @throws {Error} If used outside a localeMiddleware context
 * @returns {I18nServerContext} The server-side i18n context object containing:
 * - i18n: The internationalization processing object
 * - url: The URL object for the current request
 * - requestLocale: The locale explicitly requested by the client, if any
 * - requestPathname: The pathname of the current request
 * - pathnamePrefix: The pathname prefix for the current locale (e.g. "/en")
 * - _: The translation function bound to the current i18n instance
 * - redirect: Function to redirect to a different locale while preserving the current locale prefix
 */
export function useLinguiServer(): I18nServerContext {
  const serverContext = localeContextStorage.getStore()
  if (!serverContext) throw new Error("useLinguiServer must be used within a localeMiddleware")

  const pathnamePrefix = serverContext.requestLocale ? `/${serverContext.requestLocale}` : ""

  return {
    ...serverContext,
    _: serverContext.i18n._.bind(serverContext.i18n),
    pathnamePrefix,
    redirect: (to, init) => redirect(`${pathnamePrefix}${to}`, init),
  }
}

/**
 * Create a server middleware that detects the locale, initializes Lingui, and
 * sets Content-Language on the response. It also performs redirects to the
 * user's preferred locale when appropriate.
 *
 * The middleware eagerly loads catalogs for all configured locales on first use
 * and caches initialized I18n instances for fast requests.
 */
export function createLocaleMiddleware(config: I18nAppConfig): MiddlewareFunction<Response> {
  // Lazy-initialized reference
  let loadedLocales: Record<string, I18n>

  // Load eagerly and store it when done - middleware will wait for the promise to resolve.
  // This pattern allows for createLocaleMiddleware to be synchronous.
  // GlobalRef should not be used anywhere outside the middleware context
  const loadPromise = loadAllLocales(config).then(locales => (loadedLocales = locales))

  // Initialize global
  setGlobalRef(config, (locale: string): I18n => loadedLocales[locale])

  // Return middleware
  return async (args: { request: Request }, next: () => Promise<Response>) => {
    // Wait for lazy init
    await loadPromise
    // Run the actual middleware
    return localeMiddleware(config, args, next)
  }
}

/**
 * Internal middleware implementation. Determines the locale from the URL or the
 * Accept-Language header, initializes i18n, and runs the request within an
 * AsyncLocalStorage context containing i18n and request metadata.
 */
async function localeMiddleware(
  config: I18nAppConfig,
  { request }: { request: Request },
  next: () => Promise<Response>
): Promise<Response> {
  const url = new URL(request.url)
  const { locale, pathname, excluded } = config.parseUrlLocale(url.pathname)
  let selectedLocale = locale

  // TODO have redirect and use of headers optional

  if (!selectedLocale) {
    // Get locale from the Accept-Language header
    const preferredLocale = getAcceptedLocale(config, request.headers.get(HTTP_ACCEPT_LANGUAGE))
    if (preferredLocale) {
      if (!excluded && preferredLocale !== config.defaultLocale) {
        // Redirect to preferred locale
        throw redirect(`/${preferredLocale}${pathname}${url.search}${url.hash}`)
      } else if (excluded) {
        // Use preferred locale for API requests
        selectedLocale = preferredLocale
      }
    }
  }

  const i18n = initI18n(selectedLocale || config.defaultLocale)

  // Run the handler in the storage context
  return localeContextStorage.run(
    { i18n, url, requestLocale: selectedLocale, requestPathname: pathname },
    async () => {
      const response = await next()
      response.headers.set("Content-Language", i18n.locale)
      return response
    }
  )
}

/**
 * Parse the Accept-Language header and return the best language match
 */
function getAcceptedLocale(
  config: I18nAppConfig,
  acceptLanguage?: string | null
): string | undefined {
  if (!acceptLanguage) return

  const negotiator = new Negotiator({ headers: { HTTP_ACCEPT_LANGUAGE: acceptLanguage } })
  const accepted = negotiator.languages(config.locales.slice())

  return accepted[0]
}

/**
 * Preload and initialize Lingui I18n objects for every configured locale.
 * Returns a map of locale -> I18n.
 */
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
