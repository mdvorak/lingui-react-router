import { type I18n } from "@lingui/core"
import { type I18nContext } from "@lingui/react"
import { setI18n } from "@lingui/react/server"
import {
  createContext,
  redirect,
  type RedirectFunction,
  type RouterContextProvider,
} from "react-router"
import { $detectLocale, $getI18nInstance } from "virtual:lingui-router-loader"
import { parseUrlLocale } from "./i18n" // Assert this is included only on server
import { config } from "./runtime"

// Assert this is included only on server
if (globalThis.window) {
  throw new Error("lingui-react-router/server must be imported only on server")
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
  /** The pathname of the current request, can be used to build locale-specific urls. */
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

const LocaleContext = createContext<I18nRequestContext>()

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
export function useLinguiServer(context: Readonly<RouterContextProvider>): I18nRouterContext {
  try {
    const serverContext = context.get(LocaleContext)
    const pathnamePrefix = serverContext.requestLocale ? `/${serverContext.requestLocale}` : ""

    return {
      ...serverContext,
      _: serverContext.i18n._.bind(serverContext.i18n),
      pathnamePrefix,
      redirect: (to, init) => redirect(`${pathnamePrefix}${to}`, init),
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "No value found for context") {
      throw new Error("useLinguiServer must be used within a localeMiddleware")
    }
    throw err
  }
}

/**
 * Locale middleware implementation. Determines the locale from the URL or the
 * Accept-Language header, initializes i18n, and runs the request within an
 * AsyncLocalStorage context containing i18n and request metadata.
 */
export async function localeMiddleware(
  {
    request,
    context,
    params,
  }: { request: Request; context: Readonly<RouterContextProvider>; params: unknown },
  next: () => Promise<Response>
): Promise<Response> {
  const url = new URL(request.url)
  const { locale, rawLocale, pathname, excluded } = parseUrlLocale(url.pathname)
  let selectedLocale: string | undefined = locale ?? (params as any)[config.localeParamName]

  // TODO normalize and fallback?

  if (selectedLocale) {
    if (selectedLocale !== rawLocale) {
      // Redirect to normalized locale URL
      // Note that this intentionally ignores redirect config, but we might add a new option later
      // Without this, pre-rendered URLs would not match
      throw redirect(`/${selectedLocale}${pathname}${url.search}${url.hash}`)
    }
  } else {
    // Detect locale from request headers
    selectedLocale = handleRequestLocale(request, url, pathname, excluded)
  }

  const i18n = $getI18nInstance(selectedLocale || config.defaultLocale)
  if (!i18n) {
    throw new Error(`Missing i18n instance for ${selectedLocale}`)
  }

  // Run the handler in the storage context
  context.set(LocaleContext, {
    i18n,
    url,
    requestLocale: selectedLocale,
    requestPathname: pathname,
  })

  setI18n(i18n)
  const response = await next()
  response.headers.set("Content-Language", i18n.locale)
  response.headers.append("Vary", "Accept-Language")
  return response
}

function handleRequestLocale(
  request: Request,
  url: URL,
  pathname: string,
  excluded: boolean
): string | undefined {
  const detectedLocale = $detectLocale(getRequestHeaders(request.headers), config.locales)
  const preferredLocale = detectedLocale || config.defaultLocale

  if (excluded) {
    // Always use preferred locale for API requests
    return preferredLocale
  } else if (
    config.redirect === "always" ||
    (config.redirect === "auto" && preferredLocale !== config.defaultLocale)
  ) {
    // Redirect to a page with the preferred locale
    throw redirect(`/${preferredLocale}${pathname}${url.search}${url.hash}`)
  }
}

function getRequestHeaders(headers: Headers): Record<string, string | undefined> {
  return {
    "accept-language": headers.get("accept-language") ?? undefined,
  }
}
