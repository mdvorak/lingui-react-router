import { type I18n } from "@lingui/core"
import { type I18nContext } from "@lingui/react"
import { setI18n } from "@lingui/react/server"
import Negotiator from "negotiator"
import { AsyncLocalStorage } from "node:async_hooks"
import { redirect, type RedirectFunction } from "react-router"
import { config, parseUrlLocale } from "./runtime"
import { $getI18nInstance } from "virtual:lingui-router-loader"

const HTTP_ACCEPT_LANGUAGE = "accept-language"

// Assert this is included only on server
if (typeof window !== "undefined") {
  throw new Error("lingui.server.ts must be imported only on server")
}

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
export type I18nRouterContext = I18nContext &
  I18nRequestContext & {
    pathnamePrefix: string
    redirect: RedirectFunction
  }

const localeContextStorage = new AsyncLocalStorage<I18nRequestContext>()

/**
 * Hook to access the server-side i18n context. Use only in loaders and actions.
 *
 * @throws {Error} If used outside a localeMiddleware context
 * @returns {I18nRouterContext} The server-side i18n context object containing:
 * - i18n: The internationalization processing object
 * - url: The URL object for the current request
 * - requestLocale: The locale explicitly requested by the client, if any
 * - requestPathname: The pathname of the current request
 * - pathnamePrefix: The pathname prefix for the current locale (e.g. "/en")
 * - _: The translation function bound to the current i18n instance
 * - redirect: Function to redirect to a different locale while preserving the current locale prefix
 */
export function useLinguiServer(): I18nRouterContext {
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
 * Locale middleware implementation. Determines the locale from the URL or the
 * Accept-Language header, initializes i18n, and runs the request within an
 * AsyncLocalStorage context containing i18n and request metadata.
 */
export async function localeMiddleware(
  { request }: { request: Request },
  next: () => Promise<Response>
): Promise<Response> {
  const url = new URL(request.url)
  const { locale, pathname, excluded } = parseUrlLocale(url.pathname)
  let selectedLocale = locale

  // TODO have redirect and use of headers optional

  if (!selectedLocale) {
    // Get locale from the Accept-Language header
    const preferredLocale = getAcceptedLocale(request.headers.get(HTTP_ACCEPT_LANGUAGE))
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

  const i18n = $getI18nInstance(selectedLocale || config.defaultLocale)
  if (!i18n) {
    throw new Error(`Missing i18n instance for ${selectedLocale}`)
  }

  // Run the handler in the storage context
  return localeContextStorage.run(
    {
      i18n,
      url,
      requestLocale: selectedLocale,
      requestPathname: pathname,
    },
    async () => {
      setI18n(i18n)
      const response = await next()
      response.headers.set("Content-Language", i18n.locale)
      return response
    }
  )
}

/**
 * Parse the Accept-Language header and return the best language match
 */
function getAcceptedLocale(acceptLanguage?: string | null): string | undefined {
  if (!acceptLanguage) return

  const negotiator = new Negotiator({ headers: { HTTP_ACCEPT_LANGUAGE: acceptLanguage } })
  const accepted = negotiator.languages(config.locales.slice())

  return accepted[0]
}
